from rest_framework import serializers

from .models import SocialTask, SocialTaskParticipant, SocialTaskNodeTask
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
        child=serializers.IntegerField(), required=False
    )
    sub_tasks = SubTaskInputSerializer(many=True, required=False)

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


class InviteParticipantSerializer(serializers.Serializer):
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(), min_length=1
    )

    def validate_participant_ids(self, value):
        from django.db.models import Q
        from friendship.models import Friendship, Status

        request_user = self.context['request'].user
        root = self.context['root']

        if request_user.id in value:
            raise serializers.ValidationError("You cannot invite yourself.")
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate participant IDs.")

        existing_ids = set(root.participants.values_list('user_id', flat=True))

        for uid in value:
            if uid in existing_ids:
                raise serializers.ValidationError(f"User {uid} is already a participant.")
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

    class Meta:
        model = SocialTaskParticipant
        fields = ['id', 'user', 'status', 'rsvp_at']


class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialTask
        fields = ['id', 'title', 'description', 'duration_minutes', 'scheduled_at']


class SocialTaskDetailSerializer(serializers.ModelSerializer):
    initiator = UserMiniSerializer()
    participants = ParticipantSerializer(many=True)
    sub_tasks = serializers.SerializerMethodField()
    my_tasks = serializers.SerializerMethodField()

    class Meta:
        model = SocialTask
        fields = [
            'id', 'title', 'description', 'duration_minutes', 'scheduled_at',
            'status', 'initiator', 'participants', 'sub_tasks', 'my_tasks',
            'created_at', 'updated_at',
        ]

    def get_sub_tasks(self, obj):
        return SubTaskSerializer(
            obj.sub_tasks.filter(is_deleted=False), many=True
        ).data

    def get_my_tasks(self, obj):
        request = self.context.get('request')
        if request is None or not request.user.is_authenticated:
            return []
        node_ids = [obj.id] + list(
            obj.sub_tasks.filter(is_deleted=False).values_list('id', flat=True)
        )
        return [
            {
                'id': str(nt.task.id),
                'title': nt.task.title,
                'start_datetime': nt.task.start_datetime.isoformat() if nt.task.start_datetime else None,
                'duration_minutes': nt.task.duration_minutes,
            }
            for nt in SocialTaskNodeTask.objects.filter(
                node_id__in=node_ids,
                participant__user=request.user,
                task__is_deleted=False,
            ).select_related('task')
        ]


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
