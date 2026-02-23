import os
import json
from datetime import datetime, timezone

from django.core.management.base import BaseCommand
from task.models import TaskTemplate, TaskOverride
from task.utils import generate_overrides_for_task
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
        overrides_created = 0
        completions_marked = 0

        for item in data:
            try:
                user = User.objects.get(username=item['username'])
            except User.DoesNotExist:
                self.stderr.write(self.style.WARNING(f"User '{item['username']}' not found, skipping task '{item['title']}'"))
                tasks_skipped += 1
                continue

            # Skip if task already exists for this user
            if TaskTemplate.objects.filter(user=user, title=item['title']).exists():
                self.stdout.write(self.style.WARNING(f"Task '{item['title']}' already exists for user '{user.username}', skipping"))
                tasks_skipped += 1
                continue

            # Create the task
            task = TaskTemplate.objects.create(
                user=user,
                title=item['title'],
                start_datetime=datetime.fromisoformat(item['start_datetime'].replace('Z', '+00:00')),
                reminder_time=datetime.fromisoformat(item['reminder_time'].replace('Z', '+00:00')) if item.get('reminder_time') else None,
                duration_minutes=item.get('duration_minutes'),
                is_recurring=item.get('is_recurring', False),
                rrule=item.get('rrule'),
                timezone=item.get('timezone', 'UTC'),
                priority=item.get('priority', TaskTemplate.PRIORITY_NONE),
                emoji=item.get('emoji', ''),
            )

            for cat_name in item.get('categories', []):
                try:
                    category = InterestCategory.objects.get(name=cat_name)
                    task.categories.add(category)
                except InterestCategory.DoesNotExist:
                    self.stderr.write(self.style.WARNING(f"Category '{cat_name}' not found, skipping for task '{item['title']}'"))

            tasks_created += 1

            created = generate_overrides_for_task(task)
            overrides_created += len(created)

            for instance_str in item.get('completed_instances', []):
                instance_dt = datetime.fromisoformat(instance_str.replace('Z', '+00:00'))
                updated = TaskOverride.objects.filter(
                    task=task,
                    instance_datetime=instance_dt,
                ).update(status=TaskOverride.STATUS_COMPLETED)
                if updated:
                    completions_marked += updated
                else:
                    TaskOverride.objects.get_or_create(
                        task=task,
                        instance_datetime=instance_dt,
                        defaults={'status': TaskOverride.STATUS_COMPLETED},
                    )
                    completions_marked += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done! Tasks created: {tasks_created}, '
            f'Tasks skipped: {tasks_skipped}, '
            f'Overrides generated: {overrides_created}, '
            f'Completions marked: {completions_marked}'
        ))
