import json
from pathlib import Path

from django.core.management.base import BaseCommand

from hobby.models import Hobby, Tag


class Command(BaseCommand):
    help = 'Load hobbies and tags from data.json'

    def handle(self, *args, **options):
        data_file = Path(__file__).resolve().parents[2] / 'data.json'

        if not data_file.exists():
            raise FileNotFoundError(
                f'Hobby data file not found: {data_file}'
            )

        with data_file.open('r', encoding='utf-8') as f:
            data = json.load(f)

        for item in data:
            hobby_name = item.get('name') or item.get('hobby')
            if not hobby_name:
                self.stderr.write(
                    self.style.WARNING(
                        f'Skipping invalid item without hobby/name: {item}'
                    )
                )
                continue

            hobby, created = Hobby.objects.get_or_create(name=hobby_name)
            tag_names = item.get('tags', []) or []

            if tag_names:
                tags = []
                for tag_name in tag_names:
                    tag, _ = Tag.objects.get_or_create(name=tag_name)
                    tags.append(tag)
                hobby.tags.set(tags)
            else:
                hobby.tags.clear()

            action = 'Created' if created else 'Updated'
            self.stdout.write(
                self.style.SUCCESS(f'{action} hobby: {hobby.name}')
            )

        self.stdout.write(self.style.SUCCESS('Hobbies loaded successfully!'))