from rest_framework import serializers

from .models import SocialTask, SocialTaskParticipant
from user.models import User


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']


class SubTaskInputSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, default='', allow_blank=True)
    duration_minutes = serializers.IntegerField(min_value=1)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True, default=None)


class SocialTaskCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, default='', allow_blank=True)
    duration_minutes = serializers.IntegerField(min_value=1)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True, default=None)
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )
    sub_tasks = SubTaskInputSerializer(many=True, required=False, default=list)

    def validate_participant_ids(self, value):
        from django.db.models import Q
        from friendship.models import Friendship, Status

        request_user = self.context['request'].user
        if request_user.id in value:
            raise serializers.ValidationError("You cannot invite yourself.")
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate participant IDs.")
        for uid in value:
            is_friend = Friendship.objects.filter(
                Q(sender=request_user, receiver_id=uid) | Q(sender_id=uid, receiver=request_user),
                status=Status.ACCEPTED,
            ).exists()
            if not is_friend:
                raise serializers.ValidationError(f"User {uid} is not your friend.")
        return value


class AddSubTaskSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, default='', allow_blank=True)
    duration_minutes = serializers.IntegerField(min_value=1)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True, default=None)


class SocialTaskUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    duration_minutes = serializers.IntegerField(min_value=1, required=False)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)


class ParticipantSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer()
    personal_tasks = serializers.SerializerMethodField()

    class Meta:
        model = SocialTaskParticipant
        fields = ['id', 'user', 'status', 'rsvp_at', 'personal_tasks']

    def get_personal_tasks(self, obj):
        return [
            {
                'id': str(nt.task.id),
                'title': nt.task.title,
                'start_datetime': nt.task.start_datetime.isoformat() if nt.task.start_datetime else None,
                'duration_minutes': nt.task.duration_minutes,
            }
            for nt in obj.node_tasks.select_related('task').filter(task__is_deleted=False)
        ]


class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialTask
        fields = ['id', 'title', 'description', 'duration_minutes', 'scheduled_at']


class SocialTaskDetailSerializer(serializers.ModelSerializer):
    initiator = UserMiniSerializer()
    participants = ParticipantSerializer(many=True)
    sub_tasks = serializers.SerializerMethodField()

    class Meta:
        model = SocialTask
        fields = [
            'id', 'title', 'description', 'duration_minutes', 'scheduled_at',
            'status', 'initiator', 'participants', 'sub_tasks',
            'created_at', 'updated_at',
        ]

    def get_sub_tasks(self, obj):
        return SubTaskSerializer(
            obj.sub_tasks.filter(is_deleted=False), many=True
        ).data


class SocialTaskListSerializer(serializers.ModelSerializer):
    initiator = UserMiniSerializer()
    participant_count = serializers.SerializerMethodField()
    my_status = serializers.SerializerMethodField()

    class Meta:
        model = SocialTask
        fields = [
            'id', 'title', 'description', 'duration_minutes', 'scheduled_at',
            'status', 'initiator', 'participant_count', 'my_status', 'created_at',
        ]

    def get_participant_count(self, obj):
        return obj.participants.count()

    def get_my_status(self, obj):
        user = self.context['request'].user
        try:
            return obj.participants.get(user=user).status
        except SocialTaskParticipant.DoesNotExist:
            return None
