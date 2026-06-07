"""
Tests for AILoopService.

AILoopService orchestrates the multi-task AI loop:
  - extract_tasks: pre-pass AI call to parse user message into a task list
  - create_loop: persists AILoop in DB
  - reason_task: AI reasons about the current task and proposes choices
  - approve_task: executes the chosen action and advances the loop index
  - decline_task: records the decline reason and re-reasons the current task
  - get_active_loop: finds an active (non-completed) loop for a conversation
"""
import json
from unittest.mock import patch

from django.test import TestCase

from ai_chat.loop_service import AILoopService
from ai_chat.models import AIChoice, AILoop, Conversation, Message
from user.models import User


class _TaskExtractProvider:
    """Simulates an AI provider that returns a structured task list."""
    def __init__(self, tasks):
        self._tasks = tasks

    def extract_tasks(self, message, audio_bytes=None, audio_mime_type=None):
        return self._tasks


class _ChoiceProvider:
    """Simulates an AI provider that proposes one choice for a task."""
    def stream_with_tools(self, messages, tools):
        yield json.dumps({
            'message': 'I suggest creating this task.',
            'choices': [{
                'id': 'choice_1',
                'actions': [{
                    'action_name': 'create_TaskTemplate',
                    'params': {
                        'title': 'Buy groceries',
                        'start_datetime': '2026-06-10T09:00:00Z',
                        'priority': 'medium',
                        'emoji': '🛒',
                        'duration_minutes': 30,
                        'is_recurring': False,
                        'timezone': 'Africa/Cairo',
                    },
                }],
            }],
        })


class ExtractTasksTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='looptester', email='loop@example.com', password='pass'
        )

    def test_returns_list_of_task_strings(self):
        with patch('ai_chat.loop_service.get_ai_provider') as mock_get:
            mock_get.return_value = _TaskExtractProvider(['Buy groceries', 'Call dentist'])
            tasks = AILoopService.extract_tasks('I need to buy groceries and call the dentist')
        self.assertEqual(tasks, ['Buy groceries', 'Call dentist'])

    def test_returns_empty_list_for_plain_question(self):
        with patch('ai_chat.loop_service.get_ai_provider') as mock_get:
            mock_get.return_value = _TaskExtractProvider([])
            tasks = AILoopService.extract_tasks('What can you do?')
        self.assertEqual(tasks, [])

    def test_returns_single_task_for_single_request(self):
        with patch('ai_chat.loop_service.get_ai_provider') as mock_get:
            mock_get.return_value = _TaskExtractProvider(['Exercise at gym'])
            tasks = AILoopService.extract_tasks('I want to schedule gym time')
        self.assertIsInstance(tasks, list)
        self.assertEqual(len(tasks), 1)


class CreateLoopTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='looptester', email='loop@example.com', password='pass'
        )
        self.conversation = Conversation.objects.create(user=self.user, title='Test')

    def test_creates_ailoop_in_db(self):
        tasks = ['Task A', 'Task B', 'Task C']
        loop = AILoopService.create_loop(self.conversation, self.user, tasks)
        self.assertIsNotNone(loop.id)
        self.assertEqual(loop.tasks, tasks)
        self.assertEqual(loop.current_task_index, 0)
        self.assertEqual(loop.status, AILoop.Status.ACTIVE)
        self.assertEqual(loop.conversation, self.conversation)
        self.assertEqual(loop.user, self.user)

    def test_persisted_to_db(self):
        loop = AILoopService.create_loop(self.conversation, self.user, ['Task X'])
        fetched = AILoop.objects.get(pk=loop.id)
        self.assertEqual(fetched.tasks, ['Task X'])


class ReasonTaskTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='looptester', email='loop@example.com', password='pass'
        )
        self.conversation = Conversation.objects.create(user=self.user, title='Test')
        self.loop = AILoop.objects.create(
            conversation=self.conversation,
            user=self.user,
            tasks=['Buy groceries', 'Call dentist'],
            current_task_index=0,
            status=AILoop.Status.ACTIVE,
        )

    def test_returns_message_and_choices(self):
        with (
            patch('ai_chat.loop_service.get_task_tools', return_value=[]),
            patch('ai_chat.loop_service.get_ai_provider', return_value=_ChoiceProvider()),
        ):
            message, choices = AILoopService.reason_task(self.loop, self.user)

        self.assertIsInstance(message, Message)
        self.assertEqual(message.role, Message.Role.ASSISTANT)
        self.assertIsInstance(choices, list)
        self.assertGreater(len(choices), 0)
        self.assertIsInstance(choices[0], AIChoice)

    def test_saves_message_to_conversation(self):
        with (
            patch('ai_chat.loop_service.get_task_tools', return_value=[]),
            patch('ai_chat.loop_service.get_ai_provider', return_value=_ChoiceProvider()),
        ):
            AILoopService.reason_task(self.loop, self.user)

        self.assertTrue(
            Message.objects.filter(
                conversation=self.conversation,
                role=Message.Role.ASSISTANT,
            ).exists()
        )


class ApproveTaskTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='looptester', email='loop@example.com', password='pass'
        )
        self.conversation = Conversation.objects.create(user=self.user, title='Test')
        self.loop = AILoop.objects.create(
            conversation=self.conversation,
            user=self.user,
            tasks=['Task A', 'Task B'],
            current_task_index=0,
            status=AILoop.Status.ACTIVE,
        )
        self.message = Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.ASSISTANT,
            content='Pick an action.',
        )
        self.choice = AIChoice.objects.create(
            message=self.message,
            choice_id_string='choice_1',
            actions_payload=[],
        )

    def test_advances_task_index(self):
        AILoopService.approve_task(self.loop, self.choice)
        self.loop.refresh_from_db()
        self.assertEqual(self.loop.current_task_index, 1)

    def test_marks_choice_as_executed(self):
        AILoopService.approve_task(self.loop, self.choice)
        self.choice.refresh_from_db()
        self.assertTrue(self.choice.is_executed)

    def test_returns_false_when_more_tasks_remain(self):
        result = AILoopService.approve_task(self.loop, self.choice)
        self.assertFalse(result)

    def test_returns_true_and_marks_completed_on_last_task(self):
        self.loop.current_task_index = 1
        self.loop.save()
        result = AILoopService.approve_task(self.loop, self.choice)
        self.assertTrue(result)
        self.loop.refresh_from_db()
        self.assertEqual(self.loop.status, AILoop.Status.COMPLETED)


class GetActiveLoopTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='looptester', email='loop@example.com', password='pass'
        )
        self.conversation = Conversation.objects.create(user=self.user, title='Test')

    def test_returns_active_loop(self):
        loop = AILoop.objects.create(
            conversation=self.conversation,
            user=self.user,
            tasks=['Task A'],
            status=AILoop.Status.ACTIVE,
        )
        result = AILoopService.get_active_loop(self.conversation)
        self.assertEqual(result, loop)

    def test_returns_none_when_no_active_loop(self):
        AILoop.objects.create(
            conversation=self.conversation,
            user=self.user,
            tasks=['Task A'],
            status=AILoop.Status.COMPLETED,
        )
        result = AILoopService.get_active_loop(self.conversation)
        self.assertIsNone(result)

    def test_returns_none_when_no_loops_exist(self):
        result = AILoopService.get_active_loop(self.conversation)
        self.assertIsNone(result)
