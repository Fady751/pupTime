import json
import os
from datetime import datetime, timezone

from django.core.management.base import BaseCommand
from task.models import Task, TaskRepetition
from user.models import User, InterestCategory


class Command(BaseCommand):
    help = 'Load mock tasks from tasks_data.json into the database'

    def handle(self, *args, **options):
        data_file = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'tasks_data.json')
        data_file = os.path.abspath(data_file)

        if not os.path.exists(data_file):
            self.stderr.write(self.style.ERROR(f'File not found: {data_file}'))
            return

        with open(data_file, 'r') as f:
            data = json.load(f)

        tasks_created = 0
        tasks_skipped = 0
        repetitions_created = 0

        for item in data:
            # Find the user
            try:
                user = User.objects.get(username=item['username'])
            except User.DoesNotExist:
                self.stderr.write(self.style.WARNING(
                    f'User "{item["username"]}" not found, skipping task "{item["title"]}"'
                ))
                tasks_skipped += 1
                continue

            # Skip if task already exists for this user
            if Task.objects.filter(user=user, title=item['title']).exists():
                tasks_skipped += 1
                continue

            # Create the task
            task = Task.objects.create(
                user=user,
                title=item['title'],
                status=item.get('status', 'pending'),
                priority=item.get('priority', 'none'),
                emoji=item.get('emoji', ''),
                start_time=item['start_time'],
                end_time=item.get('end_time'),
                reminder_time=item.get('reminder_time'),
            )

            # Link categories
            category_names = item.get('categories', [])
            categories = InterestCategory.objects.filter(name__in=category_names)
            task.categories.set(categories)

            # Create repetition if present
            rep = item.get('repetition')
            if rep:
                TaskRepetition.objects.create(
                    task=task,
                    frequency=rep['frequency'],
                    time=rep.get('time'),
                )
                repetitions_created += 1

            tasks_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done! Tasks created: {tasks_created}, '
            f'Tasks skipped: {tasks_skipped}, '
            f'Repetitions created: {repetitions_created}'
        ))
