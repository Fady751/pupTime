import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils.dateparse import parse_datetime
from friendship.models import Friendship, Status

User = get_user_model()

class Command(BaseCommand):
    help = 'Load friendships from data.json into the database'

    def handle(self, *args, **options):
        data_file = os.path.join(os.path.dirname(__file__), '..', '..', 'data.json')
        data_file = os.path.abspath(data_file)

        if not os.path.exists(data_file):
            self.stderr.write(self.style.ERROR(f'File not found: {data_file}'))
            return

        with open(data_file, 'r') as f:
            friendships_data = json.load(f)

        friendship_objects = []
        existing_friendships = set(
            Friendship.objects.values_list('sender_id', 'receiver_id', 'status')
        )

        for item in friendships_data:
            try:
                sender = User.objects.get(id=item['sender'])
                receiver = User.objects.get(id=item['receiver'])
                blocked_by = User.objects.get(id=item['user_id']) if item.get('blocked_by') else None
            except User.DoesNotExist:
                self.stderr.write(self.style.WARNING(
                    f"User ID not found: sender={item['sender_id']} or receiver={item['receiver_id']} or blocked_by={item.get('blocked_by')}"
                ))
                sent_at = parse_datetime(item['sent_at'])
                accepted_at = parse_datetime(item['accepted_at']) if item.get('accepted_at') else None

            if (sender.id, receiver.id) in existing_friendships:
                continue

            friendship_objects.append(Friendship(
                sender_id=sender.id,
                receiver_id=receiver.id,
                status=item['status'],
                blocked_by_id=blocked_by,
                sent_at=sent_at,
                accepted_at=accepted_at
            ))

        Friendship.objects.bulk_create(friendship_objects)

        self.stdout.write(self.style.SUCCESS(
            f'Done! Friendships created: {len(friendship_objects)}, '
            f'Skipped (already existed): {len(friendships_data) - len(friendship_objects)}'
        ))
