from rest_framework import serializers

from .models import AIChoice, Conversation, Message


class AIChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIChoice
        fields = [
            'id',
            'choice_id_string',
            'actions_payload',
            'results_payload',
            'is_executed',
            'created_at',
        ]
        read_only_fields = fields


class MessageSerializer(serializers.ModelSerializer):
    choices = serializers.SerializerMethodField()

    def get_choices(self, obj):
        from django.db.models import Q
        choices = obj.choices.filter(Q(is_executed=False) | Q(is_executed=True, results_payload__isnull=False))
        return AIChoiceSerializer(choices, many=True).data

    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at', 'choices']
        read_only_fields = ['id', 'role', 'created_at', 'choices']


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


class ApproveAIChoiceSerializer(serializers.Serializer):
    choice_id = serializers.UUIDField(help_text="The UUID of the saved AI choice to approve.")


class ChatResponseSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField()
    message = MessageSerializer()
