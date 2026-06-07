import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

from .loop_service import AILoopService
from .models import AIChoice, AILoop, Conversation, Message
from .s3_storage import download_voice_file
from .serializers import AIChoiceSerializer, MessageSerializer
from .services import ChatService

logger = logging.getLogger(__name__)

_LOOKUP_ERRORS = (DjangoValidationError, DRFValidationError, ValueError)


class AIChatConsumer(AsyncWebsocketConsumer):
    """
    Drives the multi-task AI loop over a WebSocket.

    Client → server message types:
      - text_message    {content, conversation_id?}
      - process_voice   {voice_message_id}
      - approve_choice  {choice_id, loop_id}
      - decline_choice  {loop_id, reason}

    Server → client event types:
      loop_started, thinking, task_choices, task_approved, loop_complete,
      chat_response (no-task fallback), error
    """

    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return
        await self.accept()

    async def disconnect(self, code):
        pass

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            await self._send_error('invalid_json', 'Message must be valid JSON.')
            return

        handlers = {
            'text_message': self._handle_text_message,
            'process_voice': self._handle_process_voice,
            'approve_choice': self._handle_approve_choice,
            'decline_choice': self._handle_decline_choice,
        }
        handler = handlers.get(data.get('type'))
        if handler is None:
            await self._send_error('unknown_type', f"Unknown message type: {data.get('type')}")
            return

        try:
            await handler(data)
        except Exception:
            logger.exception('AIChatConsumer handler error')
            await self._send_error('server_error', 'An error occurred while processing the message.')

    # ── Handlers ────────────────────────────────────────────────

    async def _handle_text_message(self, data):
        setup = await self._setup_text_loop(data.get('content', ''), data.get('conversation_id'))
        if setup['kind'] == 'chat':
            await self._send_json({
                'type': 'chat_response',
                'conversation_id': setup['conversation_id'],
                'message': setup['message'],
            })
            return
        await self._send_loop_started(setup)
        await self._reason_and_emit(setup['loop_id'])

    async def _handle_process_voice(self, data):
        setup = await self._setup_voice_loop(data.get('voice_message_id'))
        if setup is None:
            await self._send_error('voice_message_not_found', 'Voice message not found.')
            return
        if setup['kind'] == 'chat':
            await self._send_json({
                'type': 'chat_response',
                'conversation_id': setup['conversation_id'],
                'message': setup['message'],
            })
            return
        await self._send_loop_started(setup)
        await self._reason_and_emit(setup['loop_id'])

    async def _handle_approve_choice(self, data):
        result = await self._approve(data.get('choice_id'), data.get('loop_id'))
        if result is None:
            await self._send_error('choice_not_found', 'Choice or loop not found.')
            return
        await self._send_json({'type': 'task_approved', 'task_index': result['approved_index']})
        if result['complete']:
            await self._send_json({'type': 'loop_complete', 'loop_id': str(data.get('loop_id'))})
        else:
            await self._reason_and_emit(data.get('loop_id'))

    async def _handle_decline_choice(self, data):
        ok = await self._decline(data.get('loop_id'), data.get('reason', ''))
        if not ok:
            await self._send_error('loop_not_found', 'Loop not found.')
            return
        await self._reason_and_emit(data.get('loop_id'))

    # ── Shared emit helpers ─────────────────────────────────────

    async def _send_loop_started(self, setup):
        await self._send_json({
            'type': 'loop_started',
            'loop_id': setup['loop_id'],
            'conversation_id': setup['conversation_id'],
            'task_count': setup['task_count'],
        })

    async def _reason_and_emit(self, loop_id):
        index = await self._get_task_index(loop_id)
        await self._send_json({'type': 'thinking', 'task_index': index})
        payload = await self._reason_current(loop_id)
        await self._send_json({'type': 'task_choices', **payload})

    async def _send_json(self, payload):
        await self.send(text_data=json.dumps(payload))

    async def _send_error(self, code, message):
        await self._send_json({'type': 'error', 'code': code, 'message': message})

    # ── Sync DB units ───────────────────────────────────────────

    @database_sync_to_async
    def _setup_text_loop(self, content, conversation_id):
        tasks = AILoopService.extract_tasks(content)
        conversation = ChatService.get_or_create_conversation(self.user, conversation_id, content)
        ChatService.save_user_message(conversation, content)

        if not tasks:
            chat_messages = ChatService.prepare_chat_messages(conversation)
            full_response = ''.join(ChatService.get_ai_response_stream(self.user, chat_messages))
            message = ChatService.process_ai_response(conversation, full_response, self.user)
            return {
                'kind': 'chat',
                'conversation_id': str(conversation.id),
                'message': MessageSerializer(message).data,
            }

        loop = AILoopService.create_loop(conversation, self.user, tasks)
        return {
            'kind': 'loop',
            'loop_id': str(loop.id),
            'conversation_id': str(conversation.id),
            'task_count': len(tasks),
        }

    @database_sync_to_async
    def _setup_voice_loop(self, voice_message_id):
        try:
            voice_message = Message.objects.select_related('conversation').get(
                pk=voice_message_id,
                conversation__user=self.user,
            )
        except (Message.DoesNotExist, *_LOOKUP_ERRORS):
            return None

        conversation = voice_message.conversation
        audio_bytes = download_voice_file(voice_message.voice_s3_key) if voice_message.voice_s3_key else None
        tasks = AILoopService.extract_tasks(
            voice_message.content or '',
            audio_bytes=audio_bytes,
            audio_mime_type=voice_message.voice_mime_type,
        )

        if not tasks:
            chat_messages = ChatService.prepare_chat_messages(
                conversation, override_last_user_content=voice_message.content or None
            )
            full_response = ''.join(ChatService.get_ai_response_stream_with_audio(
                user=self.user,
                chat_messages=chat_messages,
                audio_bytes=audio_bytes,
                audio_mime_type=voice_message.voice_mime_type,
                voice_message=voice_message,
                acoustic_hint=voice_message.voice_acoustic_hint,
            ))
            message = ChatService.process_ai_response(conversation, full_response, self.user)
            return {
                'kind': 'chat',
                'conversation_id': str(conversation.id),
                'message': MessageSerializer(message).data,
            }

        loop = AILoopService.create_loop(conversation, self.user, tasks)
        return {
            'kind': 'loop',
            'loop_id': str(loop.id),
            'conversation_id': str(conversation.id),
            'task_count': len(tasks),
        }

    @database_sync_to_async
    def _get_task_index(self, loop_id):
        loop = AILoop.objects.get(pk=loop_id, user=self.user)
        return loop.current_task_index

    @database_sync_to_async
    def _reason_current(self, loop_id):
        loop = AILoop.objects.select_related('conversation').get(pk=loop_id, user=self.user)
        message, choices = AILoopService.reason_task(loop, self.user)
        return {
            'task_index': loop.current_task_index,
            'total_tasks': len(loop.tasks),
            'message': message.content,
            'choices': AIChoiceSerializer(choices, many=True).data,
        }

    @database_sync_to_async
    def _approve(self, choice_id, loop_id):
        try:
            loop = AILoop.objects.select_related('conversation').get(
                pk=loop_id, user=self.user, status=AILoop.Status.ACTIVE,
            )
            choice = AIChoice.objects.get(pk=choice_id, message__conversation__user=self.user)
        except (AILoop.DoesNotExist, AIChoice.DoesNotExist, *_LOOKUP_ERRORS):
            return None

        approved_index = loop.current_task_index
        complete = AILoopService.approve_task(loop, choice)
        return {'approved_index': approved_index, 'complete': complete}

    @database_sync_to_async
    def _decline(self, loop_id, reason):
        try:
            loop = AILoop.objects.select_related('conversation').get(
                pk=loop_id, user=self.user, status=AILoop.Status.ACTIVE,
            )
        except (AILoop.DoesNotExist, *_LOOKUP_ERRORS):
            return False

        AILoopService.decline_task(loop, reason)
        return True
