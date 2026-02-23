from rest_framework import serializers

from .models import TaskTemplate, TaskOverride
from .utils import generate_overrides_for_task


class TaskOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskOverride
        fields = [
            'id', 'instance_datetime', 'status',
            'new_datetime', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskSerializer(serializers.ModelSerializer):
    overrides = serializers.SerializerMethodField()
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TaskTemplate
        fields = [
            'id', 'user', 'title', 'categories',
            'priority', 'emoji',
            'start_datetime', 'reminder_time', 'duration_minutes',
            'is_recurring', 'rrule', 'timezone',
            'overrides',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

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

        return attrs

    def get_overrides(self, obj):
        qs = obj.overrides.filter(is_deleted=False)

        start_date = self.context.get('start_date')
        end_date = self.context.get('end_date')
        if start_date and end_date:
            qs = qs.filter(
                instance_datetime__gte=start_date,
                instance_datetime__lte=end_date,
            )

        return TaskOverrideSerializer(
            qs.order_by('instance_datetime'), many=True,
        ).data

    def create(self, validated_data):
        categories = validated_data.pop('categories', [])
        task = TaskTemplate.objects.create(**validated_data)

        if categories:
            task.categories.set(categories)

        generate_overrides_for_task(task)

        return task

    def update(self, instance, validated_data):
        categories = validated_data.pop('categories', None)
        recurrence_changed = (
            'is_recurring' in validated_data or 'rrule' in validated_data
            or 'start_datetime' in validated_data
        )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if categories is not None:
            instance.categories.set(categories)

        if recurrence_changed:
            generate_overrides_for_task(instance)

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['categories'] = [
            {'id': cat.id, 'name': cat.name}
            for cat in instance.categories.all()
        ]
        return data
