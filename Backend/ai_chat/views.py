import json
import logging

from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai_provider import AIProviderRateLimitError, ChatMessage, get_ai_provider
from .Tools.task_tools import get_task_tools
from .models import Conversation, Message
from .serializers import (
    ConversationListSerializer,
    ConversationSerializer,
    SendMessageSerializer,
)

logger = logging.getLogger(__name__)

class ConversationListView(ListAPIView):
    """
    GET /ai/conversations/
    List all conversations for the user
    """
    serializer_class = ConversationListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)


class ConversationDetailView(RetrieveDestroyAPIView):
    """
    GET    /ai/conversations/<id>/   |retrieve conversation with messages
    DELETE /ai/conversations/<id>/   |delete conversation
    """

    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)


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

        def event_stream():
            provider = get_ai_provider()
            full_response_parts: list[str] = []
            tools = get_task_tools(request.user)

            try:
                for chunk in provider.stream_with_tools(chat_messages, tools):
                    full_response_parts.append(chunk)
                    payload = json.dumps({
                        'conversation_id': str(conversation.id),
                        'chunk': chunk,
                    })
                    yield f"data: {payload}\n\n"

                full_response = ''.join(full_response_parts)
                try:
                    parsed = json.loads(full_response)
                    saved_content = parsed.get('message', full_response) if isinstance(parsed, dict) else full_response
                except (json.JSONDecodeError, TypeError):
                    saved_content = full_response
                Message.objects.create(
                    conversation=conversation,
                    role=Message.Role.ASSISTANT,
                    content=saved_content,
                )

                done_payload = json.dumps({
                    'conversation_id': str(conversation.id),
                    'done': True,
                })
                yield f"data: {done_payload}\n\n"

            except AIProviderRateLimitError as error:
                logger.warning("AI provider quota exhausted: %s", error)
                error_payload = {
                    'conversation_id': str(conversation.id),
                    'error': str(error),
                    'error_code': 'rate_limited',
                }
                if error.retry_after_seconds is not None:
                    error_payload['retry_after_seconds'] = error.retry_after_seconds
                yield f"data: {json.dumps(error_payload)}\n\n"
            except Exception:
                logger.exception("Error while streaming AI response")
                error_payload = json.dumps({
                    'conversation_id': str(conversation.id),
                    'error': 'An error occurred while generating the response.',
                })
                yield f"data: {error_payload}\n\n"

        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream',
        )
        return response
