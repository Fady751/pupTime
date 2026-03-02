from rest_framework import serializers

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at']
        read_only_fields = ['id', 'role', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'title', 'created_at', 'updated_at', 'messages']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ConversationListSerializer(serializers.ModelSerializer):
    """a serializer used when listing conversations (no messages included)"""

    class Meta:
        model = Conversation
        fields = ['id', 'title', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SendMessageSerializer(serializers.Serializer):

    conversation_id = serializers.UUIDField(
        required=False,
        help_text="Existing conversation ID. Omit to start a new conversation.",
    )
    message = serializers.CharField(
        help_text="The user's message text.",
    )
