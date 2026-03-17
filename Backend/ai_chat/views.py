import json
import logging
import uuid

from django.db import transaction
from django.db.models import Prefetch
from django.utils import timezone
from django.utils.decorators import method_decorator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView, RetrieveDestroyAPIView
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
)
from task.models import TaskTemplate, TaskOverride
from task.serializers import TaskSerializer, TaskOverrideSerializer
from task.views import _parse_iso
from task.utils import generate_overrides_for_task

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
            enum=['create_task', 'update_task', 'delete_task'],
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

        return Response(
            {
                'detail': 'Choice executed successfully.',
                'choice_id': str(choice.id),
                'executed_actions': executed_actions,
            },
            status=status.HTTP_200_OK,
        )

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

        if action_name == 'create_task':
            requested_task_id = params.get('task_id')
            if requested_task_id:
                params = {**params, 'id': requested_task_id}
                params.pop('task_id', None)
            serializer = TaskSerializer(data=params)
            serializer.is_valid(raise_exception=True)
            task = serializer.save(user=user)
            return {
                'action_name': action_name,
                'task_id': str(task.id),
                'task_data': serializer.data
            }

        if action_name == 'update_task':
            task_id = params.get('task_id')
            if not task_id:
                raise ValidationError({'task_id': 'task_id is required for update_task.'})

            try:
                task = TaskTemplate.objects.get(pk=task_id, user=user, is_deleted=False)
            except TaskTemplate.DoesNotExist:
                raise ValidationError({'task_id': 'Task not found.'})

            update_data = {key: value for key, value in params.items() if key != 'task_id'}
            
            deleted_overrides_ids = []
            if 'rrule' in update_data:
                overrides_to_delete = TaskOverride.objects.filter(
                    task=task,
                    instance_datetime__gt=timezone.now(),
                    status=TaskOverride.STATUS_PENDING,
                    is_deleted=False
                )
                deleted_overrides_ids = list(overrides_to_delete.values_list('id', flat=True))
                overrides_to_delete.update(is_deleted=True)

            serializer = TaskSerializer(task, data=update_data, partial=True)
            serializer.is_valid(raise_exception=True)
            updated_task = serializer.save()
            
            if 'rrule' in update_data:
                generate_overrides_for_task(updated_task)

            return {
                'action_name': action_name,
                'task_id': str(updated_task.id),
                'task_data': TaskSerializer(updated_task).data,
            }

        if action_name == 'update_instance':
            instance_id = params.get('instance_id')
            new_status = params.get('status', TaskOverride.STATUS_RESCHEDULED)
            new_dt_str = params.get('new_datetime')
            notes = params.get('notes')

            if not instance_id:
                raise ValidationError({'instance_id': 'instance_id is required.'})

            try:
                override = TaskOverride.objects.get(pk=instance_id, task__user=user, is_deleted=False)
            except TaskOverride.DoesNotExist:
                raise ValidationError({'instance_id': 'Instance not found.'})

            if new_status == TaskOverride.STATUS_RESCHEDULED:
                if not new_dt_str:
                    raise ValidationError({'new_datetime': 'Required for rescheduling.'})
                parsed_dt = _parse_iso(new_dt_str)
                if not parsed_dt:
                    raise ValidationError({'new_datetime': 'Invalid format.'})
                override.new_datetime = parsed_dt
                
                TaskOverride.objects.get_or_create(
                    task=override.task,
                    instance_datetime=parsed_dt,
                    defaults={'status': TaskOverride.STATUS_PENDING}
                )

            if notes:
                override.notes = notes
            
            override.status = new_status
            override.save()
            return {
                'action_name': action_name,
                'instance_id': str(override.id),
                'status': override.status,
                'instance_data': TaskOverrideSerializer(override).data
            }

        if action_name == 'delete_task':
            task_id = params.get('task_id')
            if not task_id:
                raise ValidationError({'task_id': 'task_id is required for delete_task.'})

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

        if conversation_id:
            try:
                conversation = Conversation.objects.get(
                    pk=conversation_id, user=request.user,
                )
            except Conversation.DoesNotExist:
                return Response(
                    {'detail': 'Conversation not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            title = user_text[:80]
            conversation = Conversation.objects.create(
                user=request.user,
                title=title,
            )

        Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=user_text,
        )

        history = list(
            conversation.messages.order_by('created_at').values_list('role', 'content')
        )
        from django.utils import timezone
        current_time = timezone.now().isoformat()
        
        system_prompt = ChatMessage(
            role='system',
            content=(
                f"You are 'Gemi', a helpful personal task manager assistant. "
                f"The current date and time is {current_time}. "
                f"Use `get_today_tasks` to see today's specific instances. "
                f"Use `find_free_time` to check for gaps or resolve scheduling conflicts. "
                f"Use `get_tasks` for broader range lookups. "
                f"Fetch user interests and timezone with `get_user_preferences`. "
                f"When proposing task changes, YOU MUST use the `respond_to_user` tool with `choices`. "
                f"Distinguish between PERMANENT changes and SINGLE-DAY changes: \n"
                f"1. FOR PERMANENT CHANGES (e.g., 'Change my gym time for all future days'): Use `update_task` with the `Master Task ID`. \n"
                f"2. FOR SINGLE-DAY CHANGES (e.g., 'I'm doing my walk late today only'): Use `update_instance` with the `Occurrence ID`. \n"
                f"IMPORTANT FOR IDS: \n"
                f"- `Master Task ID` (from tools) is for `update_task` and `delete_task`. \n"
                f"- `Occurrence ID` (from tools like get_today_tasks or get_tasks) is ONLY for `update_instance`. \n"
                f"- NEVER swap these. NEVER invent an ID. If you don't have an `Occurrence ID`, use a tool to find it first. \n"
                f"IMPORTANT FOR PARAMS: \n"
                f"- For `update_instance`: instance_id (MUST be an `Occurrence ID`), status, new_datetime, notes. \n"
                f"- For `update_task`: task_id (MUST be a `Master Task ID`), title, rrule, etc."
            ),
        )
        chat_messages = [system_prompt] + [ChatMessage(role=r, content=c) for r, c in history]

        try:
            provider = get_ai_provider()
            full_response_parts: list[str] = []
            tools = get_task_tools(request.user)

            for chunk in provider.stream_with_tools(chat_messages, tools):
                full_response_parts.append(chunk)

            full_response = ''.join(full_response_parts)
            parsed = None
            try:
                parsed = json.loads(full_response)
                saved_content = parsed.get('message', full_response) if isinstance(parsed, dict) else full_response
            except (json.JSONDecodeError, TypeError):
                saved_content = full_response

            with transaction.atomic():
                assistant_message = Message.objects.create(
                    conversation=conversation,
                    role=Message.Role.ASSISTANT,
                    content=saved_content,
                )

                if isinstance(parsed, dict):
                    raw_choices = [
                        c for c in (parsed.get('choices') or [])
                        if isinstance(c, dict)
                    ]
                    if raw_choices:
                        choice_objects = []
                        for c in raw_choices:
                            actions_payload = c.get('actions', [])
                            choice_id = None
                            if isinstance(actions_payload, list):
                                for action in actions_payload:
                                    if not isinstance(action, dict):
                                        continue
                                    if action.get('action_name') != 'create_task':
                                        continue
                                    params = action.get('params') or {}
                                    if isinstance(params, str):
                                        try:
                                            params = json.loads(params)
                                        except (json.JSONDecodeError, TypeError):
                                            params = {}
                                    if isinstance(params, dict) and params.get('task_id'):
                                        try:
                                            choice_id = uuid.UUID(str(params['task_id']))
                                        except (TypeError, ValueError):
                                            choice_id = None
                                        break

                            choice_kwargs = {
                                'message': assistant_message,
                                'choice_id_string': str(c.get('id', '')),
                                'actions_payload': actions_payload,
                            }
                            if choice_id is not None:
                                choice_kwargs['id'] = choice_id

                            choice_objects.append(AIChoice(**choice_kwargs))
                        AIChoice.objects.bulk_create(choice_objects)

            message_data = MessageSerializer(assistant_message).data

            return Response(
                {
                    'conversation_id': str(conversation.id),
                    'message': message_data,
                },
                status=status.HTTP_200_OK
            )

        except AIProviderRateLimitError as error:
            logger.warning("AI provider quota exhausted: %s", error)
            error_payload = {
                'conversation_id': str(conversation.id),
                'error': str(error),
                'error_code': 'rate_limited',
            }
            if error.retry_after_seconds is not None:
                error_payload['retry_after_seconds'] = error.retry_after_seconds
            return Response(error_payload, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except Exception:
            logger.exception("Error while generating AI response")
            error_payload = {
                'conversation_id': str(conversation.id),
                'error': 'An error occurred while generating the response.',
            }
            return Response(error_payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
