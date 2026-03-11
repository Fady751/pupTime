import json
import logging

from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai_provider import ChatMessage, get_ai_provider
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
        system_prompt = ChatMessage(
            role='system',
            content=(
                "You are a helpful personal task manager assistant. "
                "You have tools to read, create, update, and delete the user's tasks. "
                "Always call get_today_tasks first when the user asks about their schedule or today's tasks."
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
                Message.objects.create(
                    conversation=conversation,
                    role=Message.Role.ASSISTANT,
                    content=full_response,
                )

                done_payload = json.dumps({
                    'conversation_id': str(conversation.id),
                    'done': True,
                })
                yield f"data: {done_payload}\n\n"

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
