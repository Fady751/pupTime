import os
import json
from datetime import datetime, timezone

from django.core.management.base import BaseCommand
from task.models import Task, TaskRepetition, TaskHistory
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
        history_created = 0

        for item in data:
            # Find the user
            try:
                user = User.objects.get(username=item['username'])
            except User.DoesNotExist:
                self.stderr.write(self.style.WARNING(f"User '{item['username']}' not found, skipping task '{item['title']}'"))
                tasks_skipped += 1
                continue

            # Skip if task already exists for this user
            if Task.objects.filter(user=user, title=item['title']).exists():
                self.stdout.write(self.style.WARNING(f"Task '{item['title']}' already exists for user '{user.username}', skipping"))
                tasks_skipped += 1
                continue

            # Create the task
            task = Task.objects.create(
                user=user,
                title=item['title'],
                start_time=datetime.fromisoformat(item['start_time']),
                end_time=datetime.fromisoformat(item['end_time']) if item.get('end_time') else None,
                reminder_time=item.get('reminder_time'),
                priority=item.get('priority', Task.PRIORITY_NONE),
                emoji=item.get('emoji', ''),
            )

            # Add categories
            for cat_name in item.get('categories', []):
                try:
                    category = InterestCategory.objects.get(name=cat_name)
                    task.categories.add(category)
                except InterestCategory.DoesNotExist:
                    self.stderr.write(self.style.WARNING(f"Category '{cat_name}' not found, skipping for task '{item['title']}'"))

            tasks_created += 1

            # Create repetitions
            for rep in item.get('repetitions', []):
                TaskRepetition.objects.create(
                    task=task,
                    frequency=rep['frequency'],
                    time=rep.get('time'),
                )
                repetitions_created += 1

            # Create history entries (completion records)
            for completion in item.get('history', []):
                TaskHistory.objects.create(
                    task=task,
                    completion_time=datetime.fromisoformat(completion['completion_time']),
                )
                history_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done! Tasks created: {tasks_created}, '
            f'Tasks skipped: {tasks_skipped}, '
            f'Repetitions created: {repetitions_created}, '
            f'History entries created: {history_created}'
        ))
