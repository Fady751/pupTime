import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils.dateparse import parse_datetime
from friendship.models import Friendship

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
            Friendship.objects.values_list('sender_id', 'receiver_id')
        )

        for item in friendships_data:

            sender = None
            receiver = None
            blocked_by = None

            try:
                sender = User.objects.get(id=item['sender'])
                receiver = User.objects.get(id=item['receiver'])

                if item.get('blocked_By'):
                    blocked_by = User.objects.get(id=item['blocked_By'])

            except User.DoesNotExist:
                self.stderr.write(self.style.WARNING(
                    f"User not found: sender={item['sender']} receiver={item['receiver']} blocked={item.get('blocked_By')}"
                ))
                continue  # مهم جدًا

            sent_at = parse_datetime(item.get('sent_at'))
            accepted_at = parse_datetime(item.get('accepted_at')) if item.get('accepted_at') else None

            if (sender.id, receiver.id) in existing_friendships:
                continue

            friendship_objects.append(
                Friendship(
                    sender=sender,
                    receiver=receiver,
                    status=item['status'],
                    blocked_by=blocked_by,
                    sent_at=sent_at,
                    accepted_at=accepted_at
                )
            )

        Friendship.objects.bulk_create(friendship_objects)

        self.stdout.write(self.style.SUCCESS(
            f'Done! Created: {len(friendship_objects)} friendships'
        ))