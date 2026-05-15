import json
import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple

from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .ai_provider import ChatMessage, get_ai_provider
from .Tools.task_tools import get_task_tools
from .models import AIChoice, Conversation, Message
from .prompts import build_system_prompt
from .snapshots import build_task_snapshot

logger = logging.getLogger(__name__)


class ChatService:
    """
    Orchestrates conversations between users and the AI assistant (PUP).
    Handles persistence, AI provider interaction, and structured response processing.
    """

    # ── Conversation & Message Persistence ──────────────────────

    @staticmethod
    def get_or_create_conversation(
        user,
        conversation_id: Optional[str] = None,
        user_text: str = "",
    ) -> Conversation:
        """Return an existing conversation or create a new one."""
        if conversation_id:
            try:
                return Conversation.objects.get(pk=conversation_id, user=user)
            except Conversation.DoesNotExist:
                raise ValidationError(
                    {'detail': 'Conversation not found.'},
                    code=status.HTTP_404_NOT_FOUND,
                )

        title = user_text[:80] or "New Conversation"
        return Conversation.objects.create(user=user, title=title)

    @staticmethod
    def save_user_message(conversation: Conversation, content: str) -> Message:
        """Persist a plain-text user message."""
        return Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=content,
        )

    @staticmethod
    def save_voice_message(
        conversation: Conversation,
        s3_key: str,
        mime_type: str,
        duration: float | None = None,
        text_content: str = '',
    ) -> Message:
        """Persist a voice message (with optional transcription)."""
        return Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=text_content,
            voice_s3_key=s3_key,
            voice_mime_type=mime_type,
            voice_duration_seconds=duration,
        )

    # ── Message Preparation & AI Interaction ────────────────────

    @staticmethod
    def prepare_chat_messages(
        conversation: Conversation,
        override_last_user_content: str = None,
    ) -> List[ChatMessage]:
        """
        Prepare the message history for the AI provider, including the system prompt.
        """
        history = list(
            conversation.messages.order_by('created_at').values_list('role', 'content', 'voice_s3_key')
        )

        messages: List[ChatMessage] = []
        for role, content, voice_s3_key in history:
            # AI APIs reject empty-string messages; substitute a placeholder for voice-only.
            if not content and voice_s3_key:
                content = '[Voice message]'
            messages.append(ChatMessage(role=role, content=content))

        if override_last_user_content is not None:
            # Replace the last user message for re-processing (e.g., after transcription)
            for i in range(len(messages) - 1, -1, -1):
                if messages[i].role == 'user':
                    messages[i] = ChatMessage(role='user', content=override_last_user_content)
                    break

        return [build_system_prompt(user=conversation.user)] + messages

    @staticmethod
    def get_ai_response_stream(user, chat_messages: List[ChatMessage]):
        """Return a streaming response from the AI provider (text only)."""
        provider = get_ai_provider()
        tools    = get_task_tools(user)
        return provider.stream_with_tools(chat_messages, tools, user=user)

    @staticmethod
    def get_ai_response_stream_with_audio(
        user,
        chat_messages: List[ChatMessage],
        audio_bytes: bytes,
        audio_mime_type: str,
    ):
        """Return a streaming response from the AI provider (text + audio)."""
        provider = get_ai_provider()
        tools    = get_task_tools(user)
        return provider.stream_with_tools_and_audio(
            chat_messages, tools, audio_bytes, audio_mime_type, user=user
        )

    # ── AI Response Processing ───────────────────────────────────

    @classmethod
    def process_ai_response(cls, conversation: Conversation, full_response: str, user) -> Message:
        """
        Parse raw AI response, persist assistant message, and handle structured choices.
        """
        parsed        = None
        saved_content = full_response

        try:
            parsed = json.loads(full_response)
            if isinstance(parsed, dict):
                saved_content = parsed.get('message', full_response)
        except (json.JSONDecodeError, TypeError):
            pass

        with transaction.atomic():
            assistant_message = Message.objects.create(
                conversation=conversation,
                role=Message.Role.ASSISTANT,
                content=saved_content,
            )

            if isinstance(parsed, dict):
                raw_choices = [c for c in (parsed.get('choices') or []) if isinstance(c, dict)]
                if raw_choices:
                    cls._create_ai_choices(assistant_message, raw_choices, user)

        return assistant_message

    @classmethod
    def _create_ai_choices(cls, assistant_message: Message, raw_choices: List[Dict], user) -> None:
        """Build and bulk-create AIChoice objects from the AI response."""
        choice_objects = []

        for c in raw_choices:
            actions_payload = c.get('actions_payload') or c.get('actions') or []
            choice_id       = None

            if isinstance(actions_payload, list):
                for action in actions_payload:
                    if not isinstance(action, dict):
                        continue

                    action_name = action.get('action_name')
                    params      = cls._normalise_params(action.get('params') or {})

                    # Use the extracted snapshot logic
                    task_snapshot, extracted_id = build_task_snapshot(action_name, params, user)
                    
                    if extracted_id:
                        choice_id = extracted_id
                    if task_snapshot:
                        action['task_snapshot'] = task_snapshot

            choice_id = cls._resolve_choice_id(c, choice_id)
            choice_id_str = str(c.get('choice_id_string') or c.get('id', ''))
            
            kwargs = {
                'message':          assistant_message,
                'choice_id_string': choice_id_str,
                'actions_payload':  actions_payload,
            }
            if choice_id is not None:
                kwargs['id'] = choice_id

            choice_objects.append(AIChoice(**kwargs))

        AIChoice.objects.bulk_create(choice_objects)

    @staticmethod
    def _normalise_params(params) -> Dict[str, Any]:
        """Standardise field names and handle JSON string params."""
        if isinstance(params, str):
            try:
                params = json.loads(params)
            except (json.JSONDecodeError, TypeError):
                params = {}

        for alias in ['task_name', 'name']:
            if alias in params and 'title' not in params:
                params['title'] = params.pop(alias)
                break

        return params

    @staticmethod
    def _resolve_choice_id(choice_dict: Dict, current_id: Optional[uuid.UUID]) -> Optional[uuid.UUID]:
        """Attempt to resolve a valid UUID for a choice."""
        if current_id is not None:
            return current_id
        provided = choice_dict.get('id')
        try:
            if provided and str(uuid.UUID(provided)) == provided:
                return uuid.UUID(provided)
        except (TypeError, ValueError):
            pass
        return None
