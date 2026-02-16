from rest_framework import serializers

from .models import Task, TaskRepetition


class TaskRepetitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskRepetition
        fields = ['id', 'frequency', 'time']
        read_only_fields = ['id']


class TaskSerializer(serializers.ModelSerializer):
    repetitions = TaskRepetitionSerializer(many=True, required=False)
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'user', 'title', 'categories', 'status',
            'reminder_time', 'start_time', 'end_time',
            'priority', 'emoji', 'repetitions',
        ]
        read_only_fields = ['id', 'user']

    def validate(self, attrs):
        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError(
                {'end_time': 'end_time must be after start_time.'}
            )

        reminder_time = attrs.get('reminder_time')
        if reminder_time is not None and reminder_time < 0:
            raise serializers.ValidationError(
                {'reminder_time': 'reminder_time must be a non-negative integer.'}
            )

        return attrs

    def create(self, validated_data):
        repetitions_data = validated_data.pop('repetitions', [])
        categories = validated_data.pop('categories', [])

        task = Task.objects.create(**validated_data)

        if categories:
            task.categories.set(categories)

        for rep_data in repetitions_data:
            TaskRepetition.objects.create(task=task, **rep_data)

        return task

    def update(self, instance, validated_data):
        repetitions_data = validated_data.pop('repetitions', None)
        categories = validated_data.pop('categories', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if categories is not None:
            instance.categories.set(categories)

        # Replace strategy: delete old repetitions and create new ones
        if repetitions_data is not None:
            instance.repetitions.all().delete()
            for rep_data in repetitions_data:
                TaskRepetition.objects.create(task=instance, **rep_data)

        return instance
