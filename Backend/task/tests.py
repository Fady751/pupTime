from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from task.models import Task, TaskRepetition
from user.models import User, InterestCategory


class TaskAPITestCase(TestCase):
    """Base class with helper utilities."""

    def setUp(self):
        self.client = APIClient()

        # Two users for ownership isolation tests
        self.user_a = User.objects.create_user(
            username='alice', email='alice@example.com', password='pass1234'
        )
        self.user_b = User.objects.create_user(
            username='bob', email='bob@example.com', password='pass1234'
        )

        self.token_a = Token.objects.create(user=self.user_a)
        self.token_b = Token.objects.create(user=self.user_b)

        self.category = InterestCategory.objects.create(name='Fitness')

        self.now = timezone.now()

    # ---------- helpers ----------

    def auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def auth_a(self):
        self.auth(self.token_a)

    def auth_b(self):
        self.auth(self.token_b)

    def task_payload(self, **overrides):
        payload = {
            'title': 'Morning run',
            'start_time': (self.now + timedelta(hours=1)).isoformat(),
            'end_time': (self.now + timedelta(hours=2)).isoformat(),
            'status': 'pending',
            'priority': 'medium',
            'emoji': '\U0001f3c3',
            'categories': [self.category.pk],
            'repetitions': [
                {'frequency': 'daily', 'time': '06:00:00'},
            ],
        }
        payload.update(overrides)
        return payload


# ==========================================================================
# Authentication tests
# ==========================================================================

class TaskAuthTests(TaskAPITestCase):
    """Unauthenticated requests must be rejected with 401."""

    def test_list_requires_auth(self):
        resp = self.client.get('/task/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_requires_auth(self):
        resp = self.client.post('/task/', self.task_payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_detail_requires_auth(self):
        self.auth_a()
        task = self.client.post('/task/', self.task_payload(), format='json').data
        self.client.credentials()  # clear auth
        resp = self.client.get(f'/task/{task["id"]}/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_requires_auth(self):
        self.auth_a()
        task = self.client.post('/task/', self.task_payload(), format='json').data
        self.client.credentials()
        resp = self.client.delete(f'/task/{task["id"]}/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ==========================================================================
# CRUD tests
# ==========================================================================

class TaskCRUDTests(TaskAPITestCase):

    def test_create_task(self):
        self.auth_a()
        resp = self.client.post('/task/', self.task_payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['title'], 'Morning run')
        self.assertEqual(resp.data['user'], self.user_a.pk)
        self.assertEqual(len(resp.data['repetitions']), 1)
        self.assertEqual(resp.data['repetitions'][0]['frequency'], 'daily')

    def test_create_task_without_repetitions(self):
        self.auth_a()
        payload = self.task_payload(repetitions=[])
        resp = self.client.post('/task/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(resp.data['repetitions']), 0)

    def test_create_task_without_optional_fields(self):
        """end_time, reminder_time, emoji, categories, repetitions are optional."""
        self.auth_a()
        payload = {
            'title': 'Quick task',
            'start_time': self.now.isoformat(),
        }
        resp = self.client.post('/task/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_list_tasks(self):
        self.auth_a()
        self.client.post('/task/', self.task_payload(), format='json')
        self.client.post('/task/', self.task_payload(title='Evening yoga'), format='json')
        resp = self.client.get('/task/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 2)
        self.assertEqual(len(resp.data['results']), 2)

    def test_retrieve_task(self):
        self.auth_a()
        task = self.client.post('/task/', self.task_payload(), format='json').data
        resp = self.client.get(f'/task/{task["id"]}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['title'], 'Morning run')

    def test_full_update_task(self):
        self.auth_a()
        task = self.client.post('/task/', self.task_payload(), format='json').data
        updated = self.task_payload(title='Updated run', priority='high', repetitions=[])
        resp = self.client.put(f'/task/{task["id"]}/', updated, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['title'], 'Updated run')
        self.assertEqual(resp.data['priority'], 'high')
        self.assertEqual(len(resp.data['repetitions']), 0)

    def test_partial_update_task(self):
        self.auth_a()
        task = self.client.post('/task/', self.task_payload(), format='json').data
        resp = self.client.patch(f'/task/{task["id"]}/', {'status': 'completed'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'completed')

    def test_delete_task(self):
        self.auth_a()
        task = self.client.post('/task/', self.task_payload(), format='json').data
        resp = self.client.delete(f'/task/{task["id"]}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        resp = self.client.get(f'/task/{task["id"]}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_replaces_repetitions(self):
        """PUT with new repetitions should replace the old ones."""
        self.auth_a()
        task = self.client.post('/task/', self.task_payload(), format='json').data
        self.assertEqual(len(task['repetitions']), 1)

        new_reps = [
            {'frequency': 'monday', 'time': '08:00:00'},
            {'frequency': 'wednesday', 'time': '08:00:00'},
        ]
        updated = self.task_payload(repetitions=new_reps)
        resp = self.client.put(f'/task/{task["id"]}/', updated, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['repetitions']), 2)
        # old repetition should be gone
        self.assertEqual(TaskRepetition.objects.filter(task_id=task['id']).count(), 2)


# ==========================================================================
# Ownership / isolation tests
# ==========================================================================

class TaskOwnershipTests(TaskAPITestCase):

    def test_user_b_cannot_see_user_a_tasks(self):
        self.auth_a()
        self.client.post('/task/', self.task_payload(), format='json')

        self.auth_b()
        resp = self.client.get('/task/')
        self.assertEqual(resp.data['count'], 0)

    def test_user_b_cannot_retrieve_user_a_task(self):
        self.auth_a()
        task = self.client.post('/task/', self.task_payload(), format='json').data

        self.auth_b()
        resp = self.client.get(f'/task/{task["id"]}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_b_cannot_update_user_a_task(self):
        self.auth_a()
        task = self.client.post('/task/', self.task_payload(), format='json').data

        self.auth_b()
        resp = self.client.patch(f'/task/{task["id"]}/', {'title': 'hacked'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_b_cannot_delete_user_a_task(self):
        self.auth_a()
        task = self.client.post('/task/', self.task_payload(), format='json').data

        self.auth_b()
        resp = self.client.delete(f'/task/{task["id"]}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        # task still exists for user A
        self.auth_a()
        resp = self.client.get(f'/task/{task["id"]}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# ==========================================================================
# Validation tests
# ==========================================================================

class TaskValidationTests(TaskAPITestCase):

    def test_end_time_before_start_time(self):
        self.auth_a()
        payload = self.task_payload(
            start_time=(self.now + timedelta(hours=2)).isoformat(),
            end_time=(self.now + timedelta(hours=1)).isoformat(),
        )
        resp = self.client.post('/task/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('end_time', resp.data)

    def test_negative_reminder_time(self):
        self.auth_a()
        payload = self.task_payload(reminder_time=-5)
        resp = self.client.post('/task/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('reminder_time', resp.data)

    def test_missing_title(self):
        self.auth_a()
        payload = self.task_payload()
        del payload['title']
        resp = self.client.post('/task/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_status_choice(self):
        self.auth_a()
        payload = self.task_payload(status='invalid')
        resp = self.client.post('/task/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_priority_choice(self):
        self.auth_a()
        payload = self.task_payload(priority='critical')
        resp = self.client.post('/task/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ==========================================================================
# Filtering & ordering tests
# ==========================================================================

class TaskFilterTests(TaskAPITestCase):

    def setUp(self):
        super().setUp()
        self.auth_a()

        # Create 3 tasks with varying properties
        self.client.post('/task/', self.task_payload(
            title='Task A', status='pending', priority='high',
        ), format='json')
        self.client.post('/task/', self.task_payload(
            title='Task B', status='completed', priority='low',
        ), format='json')
        self.client.post('/task/', self.task_payload(
            title='Task C', status='pending', priority='medium',
        ), format='json')

    def test_filter_by_status(self):
        resp = self.client.get('/task/', {'status': 'pending'})
        self.assertEqual(resp.data['count'], 2)

    def test_filter_by_priority(self):
        resp = self.client.get('/task/', {'priority': 'high'})
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['title'], 'Task A')

    def test_filter_by_category(self):
        resp = self.client.get('/task/', {'category': self.category.pk})
        self.assertEqual(resp.data['count'], 3)

    def test_ordering_by_priority(self):
        resp = self.client.get('/task/', {'ordering': 'priority'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        priorities = [t['priority'] for t in resp.data['results']]
        self.assertEqual(priorities, sorted(priorities))

    def test_invalid_ordering_ignored(self):
        """Unknown ordering param falls back to default (-start_time)."""
        resp = self.client.get('/task/', {'ordering': 'hacked_field'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# ==========================================================================
# Pagination tests
# ==========================================================================

class TaskPaginationTests(TaskAPITestCase):

    def test_pagination_structure(self):
        self.auth_a()
        for i in range(25):
            self.client.post('/task/', self.task_payload(title=f'Task {i}'), format='json')

        resp = self.client.get('/task/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 25)
        self.assertEqual(len(resp.data['results']), 20)  # page_size default
        self.assertIsNotNone(resp.data['next'])
        self.assertIsNone(resp.data['previous'])

    def test_page_two(self):
        self.auth_a()
        for i in range(25):
            self.client.post('/task/', self.task_payload(title=f'Task {i}'), format='json')

        resp = self.client.get('/task/', {'page': 2})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['results']), 5)
