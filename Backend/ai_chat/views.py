import json
import logging
import uuid
from datetime import timedelta

from django.db import transaction
from django.db.models import Prefetch
from django.utils import timezone
from django.utils.decorators import method_decorator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView, RetrieveDestroyAPIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai_provider import AIProviderRateLimitError, ChatMessage, get_ai_provider
from .Tools.task_tools import get_task_tools
from .models import AIChoice, Conversation, Message
from .serializers import (
    AIChoiceSerializer,
    ApproveAIChoiceSerializer,
    ChatResponseSerializer,
    ConversationListSerializer,
    ConversationSerializer,
    MessageSerializer,
    SendMessageSerializer,
    VoiceChatSerializer,
)
from .s3_storage import ALLOWED_MIME_TYPES, MAX_VOICE_FILE_SIZE, upload_voice_file, generate_presigned_url
from task.models import TaskTemplate, TaskOverride
from task.serializers import TaskSerializer, TaskOverrideSerializer
from task.views import _parse_iso
from task.utils import generate_overrides_for_task
from .services import ChatService

logger = logging.getLogger(__name__)


@method_decorator(
    name='list',
    decorator=swagger_auto_schema(
        tags=['AI Chat'],
        operation_summary='List conversations',
        operation_description='Returns all conversations for the authenticated user, newest first.',
        responses={200: ConversationListSerializer(many=True)},
    ),
)
class ConversationListView(ListAPIView):
    """
    GET /ai/conversations/
    List all conversations for the user
    """
    serializer_class = ConversationListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Conversation.objects.none()
        if not self.request.user.is_authenticated:
            return Conversation.objects.none()
        return Conversation.objects.filter(user=self.request.user)


@method_decorator(
    name='retrieve',
    decorator=swagger_auto_schema(
        tags=['AI Chat'],
        operation_summary='Get conversation',
        operation_description=(
            'Returns a conversation with all its messages. Each assistant message includes '
            'a `choices` array containing **pending** (not yet executed) AI-proposed action choices.'
        ),
        responses={200: ConversationSerializer()},
    ),
)
@method_decorator(
    name='destroy',
    decorator=swagger_auto_schema(
        tags=['AI Chat'],
        operation_summary='Delete conversation',
        responses={204: 'Conversation deleted.'},
    ),
)
class ConversationDetailView(RetrieveDestroyAPIView):
    """
    GET    /ai/conversations/<id>/   |retrieve conversation with messages
    DELETE /ai/conversations/<id>/   |delete conversation
    """

    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Conversation.objects.none()
        if not self.request.user.is_authenticated:
            return Conversation.objects.none()
        return Conversation.objects.filter(user=self.request.user).prefetch_related(
            'messages', 'messages__choices'
        )


_EXECUTED_ACTION_SCHEMA = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'action_name': openapi.Schema(
            type=openapi.TYPE_STRING,
            enum=['create_TaskTemplate', 'update_TaskTemplate', 'update_TaskOverride', 'delete_TaskTemplate'],
        ),
        'task_id': openapi.Schema(type=openapi.TYPE_STRING, format='uuid'),
    },
)


class ApproveAIChoiceView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        tags=['AI Chat'],
        operation_summary='Approve an AI-proposed choice',
        operation_description=(
            'Executes all actions inside the chosen `AIChoice` (create / update / delete tasks) '
            'inside a single atomic transaction, then marks the choice as executed so it cannot '
            'be re-run. The choice UUID comes from the `choices` array in the final '
            '`done` SSE event returned by `POST /ai/chat/`.'
        ),
        request_body=ApproveAIChoiceSerializer,
        responses={
            200: openapi.Response(
                description='Choice executed successfully.',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'detail': openapi.Schema(type=openapi.TYPE_STRING, example='Choice executed successfully.'),
                        'choice_id': openapi.Schema(type=openapi.TYPE_STRING, format='uuid'),
                        'executed_actions': openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=_EXECUTED_ACTION_SCHEMA,
                        ),
                    },
                ),
            ),
            400: openapi.Response(description='Choice already executed or malformed payload.'),
            404: openapi.Response(description='Choice not found or belongs to another user.'),
        },
    )
    def post(self, request):
        serializer = ApproveAIChoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            try:
                choice = (
                    AIChoice.objects
                    .select_for_update()
                    .select_related('message__conversation')
                    .get(
                        pk=serializer.validated_data['choice_id'],
                        message__conversation__user=request.user,
                    )
                )
            except AIChoice.DoesNotExist:
                return Response(
                    {'detail': 'Choice not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if choice.is_executed:
                return Response(
                    {'detail': 'Choice has already been executed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            actions = choice.actions_payload
            if not isinstance(actions, list):
                return Response(
                    {'detail': 'Choice actions payload must be a list.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            executed_actions = []
            try:
                for action in actions:
                    executed_actions.append(self._execute_action(request.user, action))
            except ValidationError as error:
                return Response(error.detail, status=status.HTTP_400_BAD_REQUEST)

            choice.results_payload = executed_actions
            choice.is_executed = True
            choice.save(update_fields=['is_executed', 'results_payload'])

            Message.objects.create(
                conversation=choice.message.conversation,
                role=Message.Role.SYSTEM,
                content=f"Executed AI Choice: {choice.choice_id_string}. Actions: {json.dumps(executed_actions)}"
            )

        return Response(
            {
                'detail': 'Choice executed successfully.',
                'choice_id': str(choice.id),
                'executed_actions': executed_actions,
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _one_month_serializer_context():
        now = timezone.now()
        return {
            'start_date': now,
            'end_date': now + timedelta(days=30),
        }

    def _execute_action(self, user, action):
        if not isinstance(action, dict):
            raise ValidationError({'actions': 'Each action must be an object.'})

        action_name = action.get('action_name')
        params = action.get('params') or {}

        if isinstance(params, str):
            try:
                params = json.loads(params)
            except (json.JSONDecodeError, TypeError):
                raise ValidationError({'params': 'Action params is not valid JSON.'})

        if not isinstance(params, dict):
            raise ValidationError({'actions': 'Each action params value must be an object.'})

        for alias in ['task_name', 'name']:
            if alias in params and 'title' not in params:
                params['title'] = params.pop(alias)
                break

        if action_name == 'create_TaskTemplate':
            requested_task_id = params.get('task_id')
            if requested_task_id:
                params = {**params, 'id': requested_task_id}
                params.pop('task_id', None)
            
            if not params.get('start_datetime'):
                now = timezone.now()
                default_dt = now.replace(hour=9, minute=0, second=0, microsecond=0)
                if default_dt < now:
                    default_dt = now
                params['start_datetime'] = default_dt.isoformat()

            if params.get('rrule') and not params.get('is_recurring'):
                params['is_recurring'] = True

            if not params.get('emoji'):
                params['emoji'] = "📝"

            serializer = TaskSerializer(data=params)
            serializer.is_valid(raise_exception=True)
            task = serializer.save(user=user)
            return {
                'action_name': action_name,
                'task_id': str(task.id),
                'task_data': serializer.data
            }

        if action_name == 'update_TaskTemplate':
            task_id = params.get('task_id') or params.get('id') or params.get('master_task_id')
            if not task_id:
                raise ValidationError({'task_id': 'task_id or id is required for update_TaskTemplate.'})

            try:
                task = TaskTemplate.objects.get(pk=task_id, user=user, is_deleted=False)
            except TaskTemplate.DoesNotExist:
                raise ValidationError({'task_id': f'Task {task_id} not found.'})

            update_data = {key: value for key, value in params.items() if key not in ['task_id', 'id', 'master_task_id']}

            if 'start_time' in update_data:
                time_str = update_data.pop('start_time')
                if task.start_datetime:
                    try:
                        import datetime as dt
                        new_time = dt.time.fromisoformat(time_str)
                        new_dt = task.start_datetime.replace(
                            hour=new_time.hour, 
                            minute=new_time.minute, 
                            second=new_time.second, 
                            microsecond=0
                        )
                        update_data['start_datetime'] = new_dt.isoformat()
                    except ValueError:
                        pass

            if update_data.get('rrule') and not update_data.get('is_recurring'):
                update_data['is_recurring'] = True

            should_regenerate = (
                'rrule' in update_data or
                ('start_datetime' in update_data and task.is_recurring)
            )

            if should_regenerate:
                overrides_to_delete = TaskOverride.objects.filter(
                    task=task,
                    instance_datetime__gt=timezone.now(),
                    status=TaskOverride.STATUS_PENDING,
                    is_deleted=False
                )
                overrides_to_delete.update(is_deleted=True)

            serializer = TaskSerializer(task, data=update_data, partial=True)
            serializer.is_valid(raise_exception=True)
            updated_task = serializer.save()

            if should_regenerate:
                generate_overrides_for_task(updated_task)

            task_data = TaskSerializer(updated_task, context=self._one_month_serializer_context()).data
            return {
                'action_name': action_name,
                'task_id': str(updated_task.id),
                'task_data': task_data,
            }

        if action_name == 'update_TaskOverride':
            instance_id = params.get('instance_id') or params.get('occurrence_id') or params.get('id')
            requested_status = params.get('status')
            new_dt_str = params.get('new_datetime') or params.get('start_datetime')
            notes = params.get('notes')

            if isinstance(requested_status, str):
                requested_status = requested_status.upper()
                if requested_status == 'DONE':
                    requested_status = TaskOverride.STATUS_COMPLETED

            if not instance_id:
                raise ValidationError({'instance_id': 'instance_id (or occurrence_id) is required.'})

            try:
                override = TaskOverride.objects.get(pk=instance_id, task__user=user, is_deleted=False)
            except TaskOverride.DoesNotExist:
                raise ValidationError({'instance_id': 'Instance not found.'})

            if not new_dt_str and requested_status == TaskOverride.STATUS_RESCHEDULED:
                raise ValidationError({'new_datetime': 'Required for rescheduling.'})

            is_reschedule = bool(new_dt_str)
            if is_reschedule:
                parsed_dt = _parse_iso(new_dt_str)
                if not parsed_dt:
                    raise ValidationError({'new_datetime': 'Invalid format.'})
                override.new_datetime = parsed_dt
                override.status = TaskOverride.STATUS_RESCHEDULED

                new_instance_status = requested_status or TaskOverride.STATUS_PENDING
                new_override, created = TaskOverride.objects.get_or_create(
                    task=override.task,
                    instance_datetime=parsed_dt,
                    defaults={'status': new_instance_status}
                )
                if not created and requested_status:
                    new_override.status = new_instance_status
                    new_override.save(update_fields=['status'])
            else:
                override.status = requested_status or TaskOverride.STATUS_RESCHEDULED

            if notes:
                override.notes = notes
            
            override.save()
            return {
                'action_name': action_name,
                'instance_id': str(override.id),
                'status': override.status,
                'instance_data': TaskOverrideSerializer(override).data
            }

        if action_name == 'delete_TaskTemplate':
            task_id = params.get('task_id') or params.get('master_task_id') or params.get('id')
            if not task_id:
                raise ValidationError({'task_id': 'task_id or id is required for delete_TaskTemplate.'})

            try:
                task = TaskTemplate.objects.get(pk=task_id, user=user, is_deleted=False)
            except TaskTemplate.DoesNotExist:
                raise ValidationError({'task_id': 'Task not found.'})

            task.is_deleted = True
            task.save(update_fields=['is_deleted'])
            return {
                'action_name': action_name,
                'task_id': str(task.id),
            }

        raise ValidationError({'action_name': f'Unsupported action: {action_name}'})


class ChatView(APIView):
    """
    POST /ai/chat/

    Send a user message and get the AI response back.

    Request body
    ------------
    {
        "message": "Hello!",
        "conversation_id": "<uuid>"  // optional | omit to start new conversation
    }

    Response
    --------
    {
        "conversation_id": "...",
        "message": {
            "id": "...",
            "role": "assistant",
            "content": "...",
            "created_at": "...",
            "choices": [...]
        }
    }
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        tags=['AI Chat'],
        operation_summary='Send a message and get the AI response',
        operation_description=(
            'Sends a message to the AI and returns the complete response.',
            'If the AI proposed task actions, the `choices` array in the response message will be non-empty. '
            'Pass the `id` (UUID) of a choice to `POST /ai/chat/approve-choice/` to execute the chosen actions.'
        ),
        request_body=SendMessageSerializer,
        responses={
            200: openapi.Response(description='AI response.', schema=ChatResponseSerializer),
            400: openapi.Response(description='Invalid request body.'),
            404: openapi.Response(description='Conversation not found.'),
        },
    )
    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_text: str = serializer.validated_data['message']
        conversation_id = serializer.validated_data.get('conversation_id')

        current_conversation_id = conversation_id

        try:
            conversation = ChatService.get_or_create_conversation(
                user=request.user, 
                conversation_id=conversation_id, 
                user_text=user_text
            )
            current_conversation_id = str(conversation.id)

            ChatService.save_user_message(conversation, user_text)

            chat_messages = ChatService.prepare_chat_messages(conversation)
            
            full_response_parts: list[str] = []
            for chunk in ChatService.get_ai_response_stream(request.user, chat_messages):
                full_response_parts.append(chunk)

            full_response = ''.join(full_response_parts)
            print("Full AI response:", full_response)
            assistant_message = ChatService.process_ai_response(
                conversation=conversation,
                full_response=full_response,
                user=request.user
            )

            return Response(
                {
                    'conversation_id': str(conversation.id),
                    'message': MessageSerializer(assistant_message).data,
                },
                status=status.HTTP_200_OK
            )

        except ValidationError as e:
            if e.detail.get('detail') == 'Conversation not found.':
                return Response(e.detail, status=status.HTTP_404_NOT_FOUND)
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except AIProviderRateLimitError as error:
            logger.warning("AI provider quota exhausted: %s", error)
            error_payload = {
                'conversation_id': current_conversation_id,
                'error': str(error),
                'error_code': 'rate_limited',
            }
            if error.retry_after_seconds is not None:
                error_payload['retry_after_seconds'] = error.retry_after_seconds
            return Response(error_payload, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except Exception:
            logger.exception("Error while generating AI response")
            return Response(
                {
                    'conversation_id': current_conversation_id,
                    'error': 'An error occurred while generating the response.',
                }, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VoiceChatView(APIView):
    """
    POST /ai/chat/voice/

    Send a voice message to the AI chat.
    Accepts multipart/form-data with an audio file.
    The audio is uploaded to S3, sent to Gemini for native understanding,
    and the AI response is returned.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @swagger_auto_schema(
        tags=['AI Chat'],
        operation_summary='Send a voice message to AI',
        operation_description=(
            'Upload a voice recording to chat with the AI. The audio is stored in S3 '
            'and sent directly to Gemini for native audio understanding. '
            'Supported formats: webm, m4a, mp3, wav, ogg, aac. Max size: 10 MB.'
        ),
        manual_parameters=[
            openapi.Parameter(
                'audio', openapi.IN_FORM, type=openapi.TYPE_FILE,
                description='Voice recording file', required=True,
            ),
            openapi.Parameter(
                'conversation_id', openapi.IN_FORM, type=openapi.TYPE_STRING,
                format='uuid', description='Existing conversation ID (optional)',
            ),
            openapi.Parameter(
                'message', openapi.IN_FORM, type=openapi.TYPE_STRING,
                description='Optional text context alongside voice',
            ),
            openapi.Parameter(
                'duration', openapi.IN_FORM, type=openapi.TYPE_NUMBER,
                description='Duration of recording in seconds',
            ),
        ],
        responses={
            200: openapi.Response(description='AI response.', schema=ChatResponseSerializer),
            400: openapi.Response(description='Invalid audio file or request.'),
            413: openapi.Response(description='Audio file too large.'),
        },
    )
    def post(self, request):
        serializer = VoiceChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        audio_file = serializer.validated_data['audio']
        conversation_id = serializer.validated_data.get('conversation_id')
        text_context = serializer.validated_data.get('message', '')
        duration = serializer.validated_data.get('duration')

        current_conversation_id = conversation_id

        audio_bytes = audio_file.read()
        mime_type = audio_file.content_type or 'audio/webm'

        if mime_type not in ALLOWED_MIME_TYPES:
            return Response(
                {
                    'error': f'Unsupported audio format: {mime_type}',
                    'supported_formats': list(ALLOWED_MIME_TYPES.keys()),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(audio_bytes) > MAX_VOICE_FILE_SIZE:
            return Response(
                {'error': f'Audio file too large. Maximum: {MAX_VOICE_FILE_SIZE // (1024*1024)} MB.'},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        import tempfile
        import os
        import subprocess

        try:
            with tempfile.NamedTemporaryFile(delete=False) as f_in, tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f_out:
                f_in.write(audio_bytes)
                f_in.flush()
                subprocess.run(
                    ['ffmpeg', '-y', '-i', f_in.name, '-c:a', 'libmp3lame', '-q:a', '2', f_out.name],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True
                )
                with open(f_out.name, 'rb') as f:
                    audio_bytes = f.read()
            os.unlink(f_in.name)
            os.unlink(f_out.name)
            mime_type = 'audio/mp3'
        except Exception as e:
            logger.error(f"Audio conversion failed: {e}")
            return Response({'error': 'Failed to process audio format.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            title = text_context[:80] if text_context else "Voice message"
            conversation = ChatService.get_or_create_conversation(
                user=request.user,
                conversation_id=conversation_id,
                user_text=title,
            )
            current_conversation_id = str(conversation.id)

            voice_message = ChatService.save_voice_message(
                conversation=conversation,
                s3_key='',  # placeholder — updated after S3 upload
                mime_type=mime_type,
                duration=duration,
                text_content=text_context,
            )

            from concurrent.futures import ThreadPoolExecutor, Future

            chat_messages = ChatService.prepare_chat_messages(conversation)

            with ThreadPoolExecutor(max_workers=1) as executor:
                s3_future: Future = executor.submit(
                    upload_voice_file,
                    file_bytes=audio_bytes,
                    user_id=request.user.id,
                    mime_type=mime_type,
                )

                full_response_parts: list[str] = []
                for chunk in ChatService.get_ai_response_stream_with_audio(
                    user=request.user,
                    chat_messages=chat_messages,
                    audio_bytes=audio_bytes,
                    audio_mime_type=mime_type,
                ):
                    full_response_parts.append(chunk)

                s3_key = s3_future.result(timeout=30)

            voice_message.voice_s3_key = s3_key
            voice_message.save(update_fields=['voice_s3_key'])

            full_response = ''.join(full_response_parts)
            logger.info("Voice chat AI response: %s", full_response[:200])

            assistant_message = ChatService.process_ai_response(
                conversation=conversation,
                full_response=full_response,
                user=request.user,
            )

            return Response(
                {
                    'conversation_id': str(conversation.id),
                    'message': MessageSerializer(assistant_message).data,
                },
                status=status.HTTP_200_OK,
            )

        except ValidationError as e:
            if hasattr(e, 'detail') and isinstance(e.detail, dict) and e.detail.get('detail') == 'Conversation not found.':
                return Response(e.detail, status=status.HTTP_404_NOT_FOUND)
            return Response(
                {'error': str(e.detail) if hasattr(e, 'detail') else str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except AIProviderRateLimitError as error:
            logger.warning("AI provider quota exhausted (voice): %s", error)
            error_payload = {
                'conversation_id': current_conversation_id,
                'error': str(error),
                'error_code': 'rate_limited',
            }
            if error.retry_after_seconds is not None:
                error_payload['retry_after_seconds'] = error.retry_after_seconds
            return Response(error_payload, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Error in voice chat")
            return Response(
                {
                    'conversation_id': current_conversation_id,
                    'error': 'An error occurred while processing the voice message.',
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class VoiceFileView(APIView):
    """
    GET /ai/voice/<uuid:message_id>/

    Retrieve a stored voice recording. Returns a redirect to the S3 presigned URL.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        tags=['AI Chat'],
        operation_summary='Get voice recording for a message',
        operation_description=(
            'Returns a 302 redirect to a presigned S3 URL for the voice recording. '
            'The URL is valid for 1 hour. Only the owner of the conversation can access it.'
        ),
        responses={
            302: openapi.Response(description='Redirect to S3 presigned URL.'),
            404: openapi.Response(description='Message not found or has no voice recording.'),
        },
    )
    def get(self, request, message_id):
        try:
            message = Message.objects.select_related('conversation').get(
                pk=message_id,
                conversation__user=request.user,
            )
        except Message.DoesNotExist:
            return Response(
                {'detail': 'Message not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not message.voice_s3_key:
            return Response(
                {'detail': 'This message has no voice recording.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        presigned_url = generate_presigned_url(message.voice_s3_key)
        if not presigned_url:
            return Response(
                {'detail': 'Failed to generate download URL.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        from django.http import HttpResponseRedirect
        return HttpResponseRedirect(presigned_url)
