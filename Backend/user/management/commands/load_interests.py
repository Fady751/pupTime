import json
import os

from django.core.management.base import BaseCommand
from user.models import InterestCategory, Interest


class Command(BaseCommand):
    help = 'Load interests from data.json into the database'

    def handle(self, *args, **options):
        data_file = os.path.join(os.path.dirname(__file__), '..', '..', 'data.json')
        data_file = os.path.abspath(data_file)

        if not os.path.exists(data_file):
            self.stderr.write(self.style.ERROR(f'File not found: {data_file}'))
            return

        with open(data_file, 'r') as f:
            data = json.load(f)

        category_names = set(item['category'] for item in data)
        existing_categories = set(
            InterestCategory.objects.filter(name__in=category_names).values_list('name', flat=True)
        )
        new_categories = [
            InterestCategory(name=name)
            for name in category_names if name not in existing_categories
        ]
        InterestCategory.objects.bulk_create(new_categories)

        category_map = dict(
            InterestCategory.objects.filter(name__in=category_names).values_list('name', 'id')
        )

        existing_titles = set(
            Interest.objects.filter(
                title__in=[item['name'] for item in data]
            ).values_list('title', flat=True)
        )
        new_interests = [
            Interest(title=item['name'], category_id=category_map[item['category']])
            for item in data if item['name'] not in existing_titles
        ]
        Interest.objects.bulk_create(new_interests)

        self.stdout.write(self.style.SUCCESS(
            f'Done! Categories created: {len(new_categories)}, '
            f'Interests created: {len(new_interests)}, '
            f'Interests skipped (already existed): {len(existing_titles)}'
        ))
