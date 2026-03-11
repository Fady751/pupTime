from rest_framework import serializers

from .models import TaskTemplate, TaskOverride
from .utils import generate_overrides_for_task, generate_overrides_for_range


class TaskOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskOverride
        fields = [
            'id', 'instance_datetime', 'status',
            'new_datetime', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class InitialOverrideSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    instance_datetime = serializers.DateTimeField()
    status = serializers.ChoiceField(choices=TaskOverride.STATUS_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class TaskSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    overrides = serializers.SerializerMethodField()
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    initial_overrides = InitialOverrideSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = TaskTemplate
        fields = [
            'id', 'user', 'title', 'categories',
            'priority', 'emoji',
            'start_datetime', 'reminder_time', 'duration_minutes',
            'is_recurring', 'rrule', 'timezone',
            'initial_overrides',
            'overrides',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['user', 'created_at']

    def validate(self, attrs):
        is_recurring = attrs.get(
            'is_recurring',
            getattr(self.instance, 'is_recurring', False),
        )
        rrule_val = attrs.get(
            'rrule',
            getattr(self.instance, 'rrule', None),
        )

        if is_recurring and not rrule_val:
            raise serializers.ValidationError(
                {'rrule': 'rrule is required for recurring tasks.'}
            )

        if not is_recurring:
            attrs['rrule'] = None

        duration = attrs.get('duration_minutes')
        if duration is not None and duration < 0:
            raise serializers.ValidationError(
                {'duration_minutes': 'duration_minutes must be non-negative.'}
            )

        reminder = attrs.get('reminder_time')
        if reminder is not None and reminder < 0:
            raise serializers.ValidationError(
                {'reminder_time': 'reminder_time must be non-negative (minutes before the task).'}
            )

        return attrs

    def get_overrides(self, obj):
        is_deleted = self.context.get('is_deleted', False)
        start_date = self.context.get('start_date')
        end_date = self.context.get('end_date')

        if start_date and end_date and not is_deleted:
            generate_overrides_for_range(obj, start_date, end_date)

        qs = obj.overrides.filter(is_deleted=is_deleted)

        if start_date and end_date:
            qs = qs.filter(
                instance_datetime__gte=start_date,
                instance_datetime__lte=end_date,
            )

        updated_after = self.context.get('updated_after')
        if updated_after:
            qs = qs.filter(updated_at__gte=updated_after)

        return TaskOverrideSerializer(
            qs.order_by('instance_datetime'), many=True,
        ).data


    def create(self, validated_data):
        categories = validated_data.pop('categories', [])
        initial_overrides = validated_data.pop('initial_overrides', [])

        task = TaskTemplate.objects.create(**validated_data)

        if categories:
            task.categories.set(categories)

        to_create = []
        for override_data in initial_overrides:
            override_attrs = {
                'task': task,
                'instance_datetime': override_data['instance_datetime'],
                'status': override_data['status'],
            }
            if 'id' in override_data:
                override_attrs['id'] = override_data['id']
            if 'notes' in override_data:
                override_attrs['notes'] = override_data['notes']
            to_create.append(TaskOverride(**override_attrs))

        if to_create:
            TaskOverride.objects.bulk_create(
                to_create,
                update_conflicts=True,
                unique_fields=['task', 'instance_datetime'],
                update_fields=['status', 'notes']
            )

        generate_overrides_for_task(task)

        return task

    def update(self, instance, validated_data):
        categories = validated_data.pop('categories', None)
        validated_data.pop('initial_overrides', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if categories is not None:
            instance.categories.set(categories)

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['categories'] = [
            {'id': cat.id, 'name': cat.name}
            for cat in instance.categories.all()
        ]
        return data
