import json
import os
from datetime import date

from django.core.management.base import BaseCommand
from user.models import User, Interest, UserInterest


class Command(BaseCommand):
    help = 'Load mock users from users_data.json into the database'

    def handle(self, *args, **options):
        data_file = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'users_data.json')
        data_file = os.path.abspath(data_file)

        if not os.path.exists(data_file):
            self.stderr.write(self.style.ERROR(f'File not found: {data_file}'))
            return

        with open(data_file, 'r') as f:
            data = json.load(f)

        users_created = 0
        users_skipped = 0
        interests_linked = 0

        for item in data:
            if User.objects.filter(username=item['username']).exists():
                users_skipped += 1
                continue

            user = User.objects.create_user(
                username=item['username'],
                email=item['email'],
                password=item['password'],
                gender=item.get('gender'),
                birth_day=date.fromisoformat(item['birth_day']) if item.get('birth_day') else None,
            )
            users_created += 1

            # Link interests
            interest_titles = item.get('interests', [])
            interests = Interest.objects.filter(title__in=interest_titles)
            user_interests = [
                UserInterest(user=user, interest=interest)
                for interest in interests
            ]
            UserInterest.objects.bulk_create(user_interests, ignore_conflicts=True)
            interests_linked += len(user_interests)

        self.stdout.write(self.style.SUCCESS(
            f'Done! Users created: {users_created}, '
            f'Users skipped (already existed): {users_skipped}, '
            f'Interests linked: {interests_linked}'
        ))
