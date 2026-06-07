"""
AILoopService — orchestrates the multi-task AI loop.

A loop is created from a user's message that contains one or more tasks. PUP
reasons about each task in turn, proposing choices; the user approves (advance)
or declines with a reason (re-reason the same task). State is persisted in the
``AILoop`` model so a disconnected client can resume.
"""
import logging

from django.db import transaction

from .ai_provider import ChatMessage, get_ai_provider
from .action_executor import execute_action
from .models import AIChoice, AILoop, Conversation, Message
from .services import ChatService
from .Tools.task_tools import get_task_tools

logger = logging.getLogger(__name__)


class AILoopService:
    @staticmethod
    def extract_tasks(user_message: str, audio_bytes: bytes | None = None, audio_mime_type: str | None = None) -> list[str]:
        """Pre-pass: ask the AI to split the user's message into discrete tasks."""
        provider = get_ai_provider()
        tasks = provider.extract_tasks(
            user_message,
            audio_bytes=audio_bytes,
            audio_mime_type=audio_mime_type,
        )
        return [t for t in (tasks or []) if isinstance(t, str) and t.strip()]

    @staticmethod
    def create_loop(conversation: Conversation, user, tasks: list[str]) -> AILoop:
        return AILoop.objects.create(
            conversation=conversation,
            user=user,
            tasks=tasks,
            current_task_index=0,
            status=AILoop.Status.ACTIVE,
        )

    @staticmethod
    def get_active_loop(conversation: Conversation) -> AILoop | None:
        return AILoop.objects.filter(
            conversation=conversation,
            status=AILoop.Status.ACTIVE,
        ).first()

    @staticmethod
    def reason_task(loop: AILoop, user) -> tuple[Message, list[AIChoice]]:
        """Ask the AI to propose choices for the loop's current task."""
        conversation = loop.conversation
        current_task = loop.tasks[loop.current_task_index]

        provider = get_ai_provider()
        tools = get_task_tools(user)

        chat_messages = ChatService.prepare_chat_messages(conversation)
        chat_messages.append(ChatMessage(
            role='user',
            content=(
                f"Focus only on this single task and propose choices for it: "
                f"\"{current_task}\". This is task {loop.current_task_index + 1} "
                f"of {len(loop.tasks)}."
            ),
        ))

        full_response = ''.join(provider.stream_with_tools(chat_messages, tools))
        message = ChatService.process_ai_response(conversation, full_response, user)
        choices = list(message.choices.all())
        return message, choices

    @staticmethod
    def approve_task(loop: AILoop, choice: AIChoice) -> bool:
        """
        Execute the approved choice, advance the loop, and report completion.

        Returns ``True`` when the loop has no more tasks (and is marked completed),
        ``False`` when there are tasks remaining.
        """
        with transaction.atomic():
            if not choice.is_executed:
                results = []
                actions = choice.actions_payload if isinstance(choice.actions_payload, list) else []
                for action in actions:
                    results.append(execute_action(loop.user, action))
                choice.results_payload = results
                choice.is_executed = True
                choice.save(update_fields=['is_executed', 'results_payload'])

            loop.current_task_index += 1
            is_complete = loop.current_task_index >= len(loop.tasks)
            if is_complete:
                loop.status = AILoop.Status.COMPLETED
            loop.save(update_fields=['current_task_index', 'status', 'updated_at'])

        return is_complete

    @staticmethod
    def decline_task(loop: AILoop, reason: str) -> Message:
        """Record the user's decline reason so the next reason_task can use it."""
        return Message.objects.create(
            conversation=loop.conversation,
            role=Message.Role.USER,
            content=reason,
        )
