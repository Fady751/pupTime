"""
Tests for AIChatConsumer (ws/ai/chat/).

The consumer drives the AI loop over WebSocket:
  - Authentication via token query param (existing TokenAuthMiddleware)
  - text_message → pre-pass extracts tasks → loop starts → per-task choices
  - process_voice → same loop, but using an already-uploaded voice message
  - approve_choice → executes action, advances loop
  - decline_choice → user explains, AI re-reasons current task
  - Reconnect while loop active → resumes from current task index

Tests mock AILoopService so no real AI calls are made.
"""
import json
import uuid

from asgiref.sync import async_to_sync, sync_to_async
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from chat.middleware import TokenAuthMiddleware
from django.test import TransactionTestCase
from rest_framework.authtoken.models import Token
from unittest.mock import patch, MagicMock

import ai_chat.routing as ai_routing
from ai_chat.models import AIChoice, AILoop, Conversation, Message
from user.models import User


def _ws_app():
    return TokenAuthMiddleware(URLRouter(ai_routing.websocket_urlpatterns))


def _make_choice(conversation, content='Pick one.', actions=None):
    msg = Message.objects.create(
        conversation=conversation,
        role=Message.Role.ASSISTANT,
        content=content,
    )
    choice = AIChoice.objects.create(
        message=msg,
        choice_id_string='choice_1',
        actions_payload=actions or [],
    )
    return msg, choice


def _make_loop(conversation, user, tasks, index=0):
    return AILoop.objects.create(
        conversation=conversation,
        user=user,
        tasks=tasks,
        current_task_index=index,
        status=AILoop.Status.ACTIVE,
    )


class ConsumerAuthTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='wsuser', email='ws@example.com', password='pass'
        )
        self.token, _ = Token.objects.get_or_create(user=self.user)

    def _run(self, coro):
        async_to_sync(coro)()

    def test_unauthenticated_connection_rejected(self):
        async def run():
            comm = WebsocketCommunicator(_ws_app(), 'ws/ai/chat/')
            connected, _ = await comm.connect()
            self.assertFalse(connected)
        self._run(run)

    def test_invalid_token_rejected(self):
        async def run():
            comm = WebsocketCommunicator(_ws_app(), 'ws/ai/chat/?token=not-a-real-token')
            connected, _ = await comm.connect()
            self.assertFalse(connected)
        self._run(run)

    def test_authenticated_connection_accepted(self):
        async def run():
            comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            await comm.disconnect()
        self._run(run)

    def test_unknown_message_type_returns_error(self):
        async def run():
            comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            await comm.send_json_to({'type': 'not_a_real_type'})
            response = await comm.receive_json_from()
            self.assertEqual(response['type'], 'error')
            self.assertEqual(response['code'], 'unknown_type')
            await comm.disconnect()
        self._run(run)


class TextMessageLoopTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='wsuser', email='ws@example.com', password='pass'
        )
        self.token, _ = Token.objects.get_or_create(user=self.user)
        self.conversation = Conversation.objects.create(user=self.user, title='Test')

    def _run(self, coro):
        async_to_sync(coro)()

    def test_text_message_with_tasks_sends_loop_started(self):
        msg, choice = _make_choice(self.conversation)
        tasks = ['Task A', 'Task B']

        async def run():
            with (
                patch('ai_chat.consumers.AILoopService.extract_tasks', return_value=tasks),
                patch('ai_chat.consumers.AILoopService.reason_task', return_value=(msg, [choice])),
            ):
                comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
                connected, _ = await comm.connect()
                self.assertTrue(connected)

                await comm.send_json_to({
                    'type': 'text_message',
                    'content': 'Buy groceries and call dentist',
                    'conversation_id': str(self.conversation.id),
                })

                started = await comm.receive_json_from()
                self.assertEqual(started['type'], 'loop_started')
                self.assertEqual(started['task_count'], 2)
                self.assertIn('loop_id', started)
                self.assertIn('conversation_id', started)

                await comm.disconnect()
        self._run(run)

    def test_text_message_with_tasks_sends_thinking_then_task_choices(self):
        msg, choice = _make_choice(self.conversation)

        async def run():
            with (
                patch('ai_chat.consumers.AILoopService.extract_tasks', return_value=['Task A']),
                patch('ai_chat.consumers.AILoopService.reason_task', return_value=(msg, [choice])),
            ):
                comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
                connected, _ = await comm.connect()
                self.assertTrue(connected)

                await comm.send_json_to({
                    'type': 'text_message',
                    'content': 'Buy groceries',
                    'conversation_id': str(self.conversation.id),
                })

                await comm.receive_json_from()  # loop_started

                thinking = await comm.receive_json_from()
                self.assertEqual(thinking['type'], 'thinking')
                self.assertEqual(thinking['task_index'], 0)

                task_choices = await comm.receive_json_from()
                self.assertEqual(task_choices['type'], 'task_choices')
                self.assertEqual(task_choices['task_index'], 0)
                self.assertEqual(task_choices['total_tasks'], 1)
                self.assertEqual(len(task_choices['choices']), 1)
                self.assertEqual(task_choices['choices'][0]['id'], str(choice.id))

                await comm.disconnect()
        self._run(run)

    def test_text_message_with_no_tasks_falls_back_to_plain_chat(self):
        fallback_msg = Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.ASSISTANT,
            content='Hello!',
        )

        async def run():
            with (
                patch('ai_chat.consumers.AILoopService.extract_tasks', return_value=[]),
                patch('ai_chat.consumers.AILoopService.reason_task') as mock_reason,
                patch('ai_chat.consumers.ChatService.get_or_create_conversation', return_value=self.conversation),
                patch('ai_chat.consumers.ChatService.save_user_message', return_value=None),
                patch('ai_chat.consumers.ChatService.prepare_chat_messages', return_value=[]),
                patch('ai_chat.consumers.ChatService.get_ai_response_stream', return_value=iter(['Hello!'])),
                patch('ai_chat.consumers.ChatService.process_ai_response', return_value=fallback_msg),
            ):
                comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
                connected, _ = await comm.connect()
                self.assertTrue(connected)

                await comm.send_json_to({
                    'type': 'text_message',
                    'content': 'What can you do?',
                })

                response = await comm.receive_json_from()
                self.assertEqual(response['type'], 'chat_response')
                mock_reason.assert_not_called()

                await comm.disconnect()
        self._run(run)

    def test_text_message_creates_new_conversation_when_none_provided(self):
        msg, choice = _make_choice(self.conversation)

        async def run():
            with (
                patch('ai_chat.consumers.AILoopService.extract_tasks', return_value=['Task A']),
                patch('ai_chat.consumers.AILoopService.reason_task', return_value=(msg, [choice])),
            ):
                comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
                connected, _ = await comm.connect()
                self.assertTrue(connected)

                await comm.send_json_to({'type': 'text_message', 'content': 'Create a task'})

                started = await comm.receive_json_from()
                self.assertEqual(started['type'], 'loop_started')
                conv_id = started['conversation_id']
                exists = await sync_to_async(
                    Conversation.objects.filter(id=conv_id, user=self.user).exists
                )()
                self.assertTrue(exists)

                await comm.disconnect()
        self._run(run)


class ProcessVoiceTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='wsuser', email='ws@example.com', password='pass'
        )
        self.token, _ = Token.objects.get_or_create(user=self.user)
        self.conversation = Conversation.objects.create(user=self.user, title='Voice test')
        self.voice_message = Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.USER,
            content='',
            voice_s3_key='voice/test/file.mp3',
            voice_mime_type='audio/mp3',
            voice_acoustic_hint='calm voice',
        )

    def _run(self, coro):
        async_to_sync(coro)()

    def test_unknown_voice_message_id_returns_error(self):
        async def run():
            comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            await comm.send_json_to({'type': 'process_voice', 'voice_message_id': str(uuid.uuid4())})
            response = await comm.receive_json_from()
            self.assertEqual(response['type'], 'error')
            self.assertEqual(response['code'], 'voice_message_not_found')
            await comm.disconnect()
        self._run(run)

    def test_voice_message_belonging_to_other_user_returns_error(self):
        other = User.objects.create_user(username='other', email='other@example.com', password='pass')
        other_conv = Conversation.objects.create(user=other, title='Other')
        other_msg = Message.objects.create(
            conversation=other_conv,
            role=Message.Role.USER,
            voice_s3_key='voice/other/file.mp3',
        )

        async def run():
            comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            await comm.send_json_to({'type': 'process_voice', 'voice_message_id': str(other_msg.id)})
            response = await comm.receive_json_from()
            self.assertEqual(response['type'], 'error')
            self.assertEqual(response['code'], 'voice_message_not_found')
            await comm.disconnect()
        self._run(run)

    def test_valid_voice_message_starts_loop(self):
        msg, choice = _make_choice(self.conversation)

        async def run():
            with (
                patch('ai_chat.consumers.download_voice_file', return_value=b'fakeaudio'),
                patch('ai_chat.consumers.AILoopService.extract_tasks', return_value=['Buy groceries']),
                patch('ai_chat.consumers.AILoopService.reason_task', return_value=(msg, [choice])),
            ):
                comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
                connected, _ = await comm.connect()
                self.assertTrue(connected)
                await comm.send_json_to({
                    'type': 'process_voice',
                    'voice_message_id': str(self.voice_message.id),
                })
                started = await comm.receive_json_from()
                self.assertEqual(started['type'], 'loop_started')
                self.assertEqual(started['task_count'], 1)
                await comm.disconnect()
        self._run(run)


class ApproveChoiceTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='wsuser', email='ws@example.com', password='pass'
        )
        self.token, _ = Token.objects.get_or_create(user=self.user)
        self.conversation = Conversation.objects.create(user=self.user, title='Test')

    def _run(self, coro):
        async_to_sync(coro)()

    def test_approve_choice_sends_task_approved(self):
        loop = _make_loop(self.conversation, self.user, ['Task A', 'Task B'], index=0)
        msg, choice = _make_choice(self.conversation, content='Task A choice.')
        next_msg, next_choice = _make_choice(self.conversation, content='Task B choice.')

        async def run():
            with (
                patch('ai_chat.consumers.AILoopService.approve_task', return_value=False),
                patch('ai_chat.consumers.AILoopService.reason_task', return_value=(next_msg, [next_choice])),
            ):
                comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
                connected, _ = await comm.connect()
                self.assertTrue(connected)

                await comm.send_json_to({
                    'type': 'approve_choice',
                    'choice_id': str(choice.id),
                    'loop_id': str(loop.id),
                })

                approved = await comm.receive_json_from()
                self.assertEqual(approved['type'], 'task_approved')
                self.assertEqual(approved['task_index'], 0)

                await comm.disconnect()
        self._run(run)

    def test_approve_choice_moves_to_next_task_choices(self):
        # No approve_task mock here: the real approve_task advances the loop index
        # (the choice has empty actions, so nothing is executed) so the next
        # task_choices must report task_index 1.
        loop = _make_loop(self.conversation, self.user, ['Task A', 'Task B'], index=0)
        msg, choice = _make_choice(self.conversation, content='Task A choice.')
        next_msg, next_choice = _make_choice(self.conversation, content='Task B choice.')

        async def run():
            with (
                patch('ai_chat.consumers.AILoopService.reason_task', return_value=(next_msg, [next_choice])),
            ):
                comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
                connected, _ = await comm.connect()
                self.assertTrue(connected)

                await comm.send_json_to({
                    'type': 'approve_choice',
                    'choice_id': str(choice.id),
                    'loop_id': str(loop.id),
                })

                await comm.receive_json_from()  # task_approved

                thinking = await comm.receive_json_from()
                self.assertEqual(thinking['type'], 'thinking')

                task_choices = await comm.receive_json_from()
                self.assertEqual(task_choices['type'], 'task_choices')
                self.assertEqual(task_choices['task_index'], 1)
                self.assertEqual(len(task_choices['choices']), 1)

                await comm.disconnect()
        self._run(run)

    def test_approving_last_task_sends_loop_complete(self):
        loop = _make_loop(self.conversation, self.user, ['Only Task'], index=0)
        msg, choice = _make_choice(self.conversation, content='Only task choice.')

        async def run():
            with patch('ai_chat.consumers.AILoopService.approve_task', return_value=True):
                comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
                connected, _ = await comm.connect()
                self.assertTrue(connected)

                await comm.send_json_to({
                    'type': 'approve_choice',
                    'choice_id': str(choice.id),
                    'loop_id': str(loop.id),
                })

                approved = await comm.receive_json_from()
                self.assertEqual(approved['type'], 'task_approved')

                complete = await comm.receive_json_from()
                self.assertEqual(complete['type'], 'loop_complete')

                await comm.disconnect()
        self._run(run)

    def test_choice_not_found_returns_error(self):
        async def run():
            comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
            connected, _ = await comm.connect()
            self.assertTrue(connected)

            await comm.send_json_to({
                'type': 'approve_choice',
                'choice_id': str(uuid.uuid4()),
                'loop_id': str(uuid.uuid4()),
            })

            response = await comm.receive_json_from()
            self.assertEqual(response['type'], 'error')
            self.assertEqual(response['code'], 'choice_not_found')

            await comm.disconnect()
        self._run(run)


class DeclineChoiceTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='wsuser', email='ws@example.com', password='pass'
        )
        self.token, _ = Token.objects.get_or_create(user=self.user)
        self.conversation = Conversation.objects.create(user=self.user, title='Test')

    def _run(self, coro):
        async_to_sync(coro)()

    def test_decline_with_reason_triggers_re_reasoning(self):
        loop = _make_loop(self.conversation, self.user, ['Task A', 'Task B'], index=0)
        revised_msg, revised_choice = _make_choice(self.conversation, content='Revised suggestion.')

        async def run():
            with (
                patch('ai_chat.consumers.AILoopService.decline_task') as mock_decline,
                patch('ai_chat.consumers.AILoopService.reason_task', return_value=(revised_msg, [revised_choice])),
            ):
                comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
                connected, _ = await comm.connect()
                self.assertTrue(connected)

                await comm.send_json_to({
                    'type': 'decline_choice',
                    'loop_id': str(loop.id),
                    'reason': 'I prefer mornings, not evenings.',
                })

                thinking = await comm.receive_json_from()
                self.assertEqual(thinking['type'], 'thinking')

                task_choices = await comm.receive_json_from()
                self.assertEqual(task_choices['type'], 'task_choices')
                self.assertEqual(task_choices['task_index'], 0)
                mock_decline.assert_called_once()

                await comm.disconnect()
        self._run(run)

    def test_loop_not_found_returns_error(self):
        async def run():
            comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
            connected, _ = await comm.connect()
            self.assertTrue(connected)

            await comm.send_json_to({
                'type': 'decline_choice',
                'loop_id': str(uuid.uuid4()),
                'reason': 'Change it.',
            })

            response = await comm.receive_json_from()
            self.assertEqual(response['type'], 'error')
            self.assertEqual(response['code'], 'loop_not_found')

            await comm.disconnect()
        self._run(run)


class ReconnectTests(TransactionTestCase):
    """
    The loop persists in DB, so a fresh WS connection can resume it
    by sending approve_choice or decline_choice with the existing loop_id.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='wsuser', email='ws@example.com', password='pass'
        )
        self.token, _ = Token.objects.get_or_create(user=self.user)
        self.conversation = Conversation.objects.create(user=self.user, title='Test')

    def _run(self, coro):
        async_to_sync(coro)()

    def test_active_loop_is_accessible_after_reconnect(self):
        loop = _make_loop(self.conversation, self.user, ['Task A', 'Task B'], index=0)
        msg, choice = _make_choice(self.conversation)
        next_msg, next_choice = _make_choice(self.conversation, content='Next.')

        async def run():
            with (
                patch('ai_chat.consumers.AILoopService.approve_task', return_value=False),
                patch('ai_chat.consumers.AILoopService.reason_task', return_value=(next_msg, [next_choice])),
            ):
                # Fresh connection simulates reconnect
                comm = WebsocketCommunicator(_ws_app(), f'ws/ai/chat/?token={self.token.key}')
                connected, _ = await comm.connect()
                self.assertTrue(connected)

                await comm.send_json_to({
                    'type': 'approve_choice',
                    'choice_id': str(choice.id),
                    'loop_id': str(loop.id),
                })

                approved = await comm.receive_json_from()
                self.assertEqual(approved['type'], 'task_approved')

                await comm.disconnect()
        self._run(run)
