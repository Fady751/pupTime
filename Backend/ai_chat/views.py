import json
import logging

from django.db import transaction
from django.db.models import Prefetch
from django.http import HttpResponse # Keep if needed elsewhere, but ChatView won't use StreamingHttpResponse
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
    ConversationListSerializer,
    ConversationSerializer,
    SendMessageSerializer,
)
from task.models import TaskTemplate
from task.serializers import TaskSerializer

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
        return Conversation.objects.filter(user=self.request.user).prefetch_related(
            'messages',
            Prefetch('messages__choices', queryset=AIChoice.objects.filter(is_executed=False)),
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

            choice.is_executed = True
            choice.save(update_fields=['is_executed'])

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

        # Gemini sometimes serialises params as a JSON string instead of an object
        if isinstance(params, str):
            try:
                params = json.loads(params)
            except (json.JSONDecodeError, TypeError):
                raise ValidationError({'params': 'Action params is not valid JSON.'})

        if not isinstance(params, dict):
            raise ValidationError({'actions': 'Each action params value must be an object.'})

        if action_name == 'create_task':
            serializer = TaskSerializer(data=params)
            serializer.is_valid(raise_exception=True)
            task = serializer.save(user=user)
            return {
                'action_name': action_name,
                'task_id': str(task.id),
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
            serializer = TaskSerializer(task, data=update_data, partial=True)
            serializer.is_valid(raise_exception=True)
            updated_task = serializer.save()
            return {
                'action_name': action_name,
                'task_id': str(updated_task.id),
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

    Send a user message and stream the AI response back.

    Request body
    ------------
    {
        "message": "Hello!",
        "conversation_id": "<uuid>"  // optional | omit to start new conversation
    }

    Response
    --------
    ``text/event-stream`` with Server-Sent Events:
        data: {"conversation_id": "...", "chunk": "partial text"}
        ...
        data: {"conversation_id": "...", "done": true}
    """

    permission_classes = [IsAuthenticated]

    _CHOICE_REF_SCHEMA = openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'id': openapi.Schema(
                type=openapi.TYPE_STRING, format='uuid',
                description='UUID to pass to POST /ai/chat/approve-choice/.',
            ),
            'choice_id_string': openapi.Schema(
                type=openapi.TYPE_STRING,
                description="Human-readable label assigned by the AI (e.g. 'choice_1').",
            ),
        },
    )

    @swagger_auto_schema(
        tags=['AI Chat'],
        operation_summary='Send a message and get the AI response',
        operation_description=(
            'Sends a user message and returns the full AI response as JSON.\n\n'
            'If the AI proposed task actions, `choices` will be non-empty. '
            'Pass the `id` (UUID) to `POST /ai/chat/approve-choice/` to execute the chosen actions.'
        ),
        request_body=SendMessageSerializer,
        responses={
            200: openapi.Response(
                description='Successful AI response.',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'conversation_id': openapi.Schema(type=openapi.TYPE_STRING, format='uuid'),
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'choices': openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=_CHOICE_REF_SCHEMA,
                        ),
                    },
                ),
            ),
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
                f"You are a helpful personal task manager assistant. "
                f"The current date and time is {current_time}. "
                f"Always call get_today_tasks first when the user asks about their schedule or today's tasks. "
                f"When scheduling a new task, use check_schedule_conflict to avoid double-booking. "
                f"When the user asks when they have time for something, use find_free_time. "
                f"When assessing how busy they are over a period, use get_daily_load_summary. "
                f"To proactively remind users of missed items, use get_overdue_tasks. "
                f"Fetch their interests and timezone with get_user_preferences to tailor your suggestions. "
                f"If check_schedule_conflict returns conflicts, DO NOT just ask if they still want to schedule it. "
                f"Instead, you MUST proactively use find_free_time to suggest alternative times for the NEW task, AND propose a choice to reschedule the EXISTING conflicting task(s) to a different time. "
                f"You CANNOT directly execute task creations, updates, or deletions. "
                f"If the user wants to perform these operations, you MUST use the `respond_to_user` tool to propose actions as choices. "
                f"You can provide MULTIPLE choices in the `choices` array to give the user options. "
                f"Inside each choice, you can include MULTIPLE actions in the `actions` array (e.g., delete a task AND create a new one in the same choice). "
                f"IMPORTANT FOR PARAMS: The `params` object inside an action MUST EXACTLY match our schema: "
                f"For create_task use: title, start_datetime (ISO 8601), priority (none|low|medium|high), emoji, reminder_time, duration_minutes, is_recurring, rrule, timezone. "
                f"For update_task use: task_id (UUID), and optionally any of the create_task fields. "
                f"For delete_task use: task_id (UUID). "
                f"NEVER invent field names like 'due_date'. Use 'start_datetime'."
            ),
        )
        chat_messages = [system_prompt] + [ChatMessage(role=r, content=c) for r, c in history]

        provider = get_ai_provider()
        tools = get_task_tools(request.user)

        try:
            full_response_parts: list[str] = []
            for chunk in provider.stream_with_tools(chat_messages, tools):
                full_response_parts.append(chunk)

            full_response = ''.join(full_response_parts)
            parsed = None
            try:
                parsed = json.loads(full_response)
                saved_content = parsed.get('message', full_response) if isinstance(parsed, dict) else full_response
            except (json.JSONDecodeError, TypeError):
                saved_content = full_response

            assistant_message = Message.objects.create(
                conversation=conversation,
                role=Message.Role.ASSISTANT,
                content=saved_content,
            )

            created_choices: list[AIChoice] = []
            if isinstance(parsed, dict):
                raw_choices = [
                    c for c in (parsed.get('choices') or [])
                    if isinstance(c, dict)
                ]
                if raw_choices:
                    choice_objects = [
                        AIChoice(
                            message=assistant_message,
                            choice_id_string=str(c.get('id', '')),
                            actions_payload=c.get('actions', []),
                        )
                        for c in raw_choices
                    ]
                    AIChoice.objects.bulk_create(choice_objects)
                    created_choices = choice_objects

            return Response({
                'conversation_id': str(conversation.id),
                'message': saved_content,
                'choices': [
                    {'id': str(c.id), 'choice_id_string': c.choice_id_string}
                    for c in created_choices
                ],
            }, status=status.HTTP_200_OK)

        except AIProviderRateLimitError as error:
            logger.warning("AI provider quota exhausted: %s", error)
            error_data = {
                'error': str(error),
                'error_code': 'rate_limited',
            }
            if error.retry_after_seconds is not None:
                error_data['retry_after_seconds'] = error.retry_after_seconds
            return Response(error_data, status=status.HTTP_429_TOO_MANY_REQUESTS)

        except Exception:
            logger.exception("Error while generating AI response")
            return Response({
                'error': 'An error occurred while generating the response.',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
