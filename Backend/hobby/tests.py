from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, post_delete
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from ai_chat.models import UserMemory
from friendship.models import Friendship, Status
from hobby import recommend
from hobby.models import Hobby, HobbyRecommendation, hobby_changed_handler
from task.models import TaskOverride, TaskTemplate

User = get_user_model()


class HobbyRecommendationsTests(APITestCase):

    def setUp(self):
        # Disconnect Celery signals during test to avoid Redis connection errors
        post_save.disconnect(hobby_changed_handler, sender=Hobby)
        post_delete.disconnect(hobby_changed_handler, sender=Hobby)

        # Create users
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.friend = User.objects.create_user(username='frienduser', password='password123')

        # Create acceptance of friendship
        Friendship.objects.create(
            sender=self.user,
            receiver=self.friend,
            status=Status.ACCEPTED
        )

        # Create hobbies
        self.hobby1 = Hobby.objects.create(name='Coding')
        self.hobby2 = Hobby.objects.create(name='Quantum Physics')

        # Create friend recommendations for user
        self.friend_rec = HobbyRecommendation.objects.create(user=self.user, rec_type='friend')
        self.friend_rec.hobbies.set([self.hobby1])

        # Create self recommendations for user
        self.self_rec = HobbyRecommendation.objects.create(user=self.user, rec_type='self')
        self.self_rec.hobbies.set([self.hobby2])

        # Authenticate
        self.client.force_authenticate(user=self.user)

    def tearDown(self):
        # Reconnect Celery signals after test
        post_save.connect(hobby_changed_handler, sender=Hobby)
        post_delete.connect(hobby_changed_handler, sender=Hobby)

    def test_friend_hobby_view_format(self):
        url = reverse('hobby:friend-hobby-suggestions-default')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertTrue(len(response.data) > 0)

        for item in response.data:
            self.assertIn('title', item)
            self.assertEqual(item['title'], 'Coding')
            self.assertIn('id', item)
            self.assertIsNone(item['timezone'])
            self.assertEqual(item['override'], 1)
            self.assertFalse(item['is_overriding'])
            self.assertIn('start_datetime', item)
            self.assertIn('created_at', item)
            self.assertEqual(item['emoji'], '💻')
            self.assertEqual(item['duration_minutes'], 60)
            self.assertFalse(item['is_deleted'])
            self.assertFalse(item['is_recurring'])
            self.assertIsNone(item['rrule'])

    def test_self_hobby_view_format(self):
        url = reverse('hobby:self-hobby-suggestions')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertTrue(len(response.data) > 0)

        for item in response.data:
            self.assertIn('title', item)
            self.assertEqual(item['title'], 'Quantum Physics')
            self.assertIn('id', item)
            self.assertIsNone(item['timezone'])
            self.assertEqual(item['override'], 1)
            self.assertFalse(item['is_overriding'])
            self.assertIn('start_datetime', item)
            self.assertIn('created_at', item)
            self.assertEqual(item['emoji'], '⚛️')
            self.assertEqual(item['duration_minutes'], 60)
            self.assertFalse(item['is_deleted'])
            self.assertFalse(item['is_recurring'])
            self.assertIsNone(item['rrule'])


class CandidateSlotTests(APITestCase):

    def setUp(self):
        post_save.disconnect(hobby_changed_handler, sender=Hobby)
        post_delete.disconnect(hobby_changed_handler, sender=Hobby)
        self.user = User.objects.create_user(username='slotuser', password='password123')

    def tearDown(self):
        post_save.connect(hobby_changed_handler, sender=Hobby)
        post_delete.connect(hobby_changed_handler, sender=Hobby)

    def test_candidates_are_future_and_sorted(self):
        slots = recommend._build_candidate_slots(self.user, duration_minutes=60)

        now = timezone.now()
        self.assertTrue(len(slots) > 0)
        self.assertEqual(slots, sorted(slots))
        for slot in slots:
            self.assertGreater(slot, now)

    def test_candidates_exclude_busy_window(self):
        now = timezone.now()
        noon = (now + timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
        task = TaskTemplate.objects.create(
            user=self.user, title='busy', start_datetime=noon,
            duration_minutes=60, timezone='UTC',
        )
        TaskOverride.objects.create(
            task=task, instance_datetime=noon, status=TaskOverride.STATUS_PENDING,
        )

        slots = recommend._build_candidate_slots(self.user, duration_minutes=60)

        self.assertNotIn(noon, slots)
        self.assertIn(noon.replace(hour=15), slots)


class SuggestTimeSlotsTests(APITestCase):

    def setUp(self):
        post_save.disconnect(hobby_changed_handler, sender=Hobby)
        post_delete.disconnect(hobby_changed_handler, sender=Hobby)
        self.user = User.objects.create_user(username='suguser', password='password123')
        self.h1 = Hobby.objects.create(name='Yoga')
        self.h2 = Hobby.objects.create(name='Gaming')

    def tearDown(self):
        post_save.connect(hobby_changed_handler, sender=Hobby)
        post_delete.connect(hobby_changed_handler, sender=Hobby)

    def test_empty_hobbies_returns_empty(self):
        self.assertEqual(recommend.suggest_time_slots(self.user, [], duration_minutes=60), [])

    def test_no_facts_returns_earliest_candidates_without_ai(self):
        candidates = recommend._build_candidate_slots(self.user, duration_minutes=60)

        with patch.object(recommend, '_rank_slots_with_ai') as mock_rank:
            slots = recommend.suggest_time_slots(self.user, [self.h1, self.h2], duration_minutes=60)

        mock_rank.assert_not_called()
        self.assertEqual(slots, candidates[:2])

    def test_ai_assignment_is_used(self):
        UserMemory.objects.create(
            user=self.user, fact_content='Prefers mornings',
            category='preference', importance_score=8,
        )
        candidates = recommend._build_candidate_slots(self.user, duration_minutes=60)

        with patch.object(recommend, '_rank_slots_with_ai', return_value=[2, 0]) as mock_rank:
            slots = recommend.suggest_time_slots(self.user, [self.h1, self.h2], duration_minutes=60)

        mock_rank.assert_called_once()
        self.assertEqual(slots[0], candidates[2])
        self.assertEqual(slots[1], candidates[0])

    def test_invalid_or_duplicate_indices_are_sanitized(self):
        UserMemory.objects.create(
            user=self.user, fact_content='Night owl',
            category='habit', importance_score=5,
        )
        candidates = recommend._build_candidate_slots(self.user, duration_minutes=60)

        with patch.object(recommend, '_rank_slots_with_ai', return_value=[0, 999]):
            slots = recommend.suggest_time_slots(self.user, [self.h1, self.h2], duration_minutes=60)

        self.assertEqual(slots[0], candidates[0])
        self.assertEqual(slots[1], candidates[1])
        self.assertNotEqual(slots[0], slots[1])

    def test_ai_failure_falls_back_to_earliest(self):
        UserMemory.objects.create(
            user=self.user, fact_content='Night owl',
            category='habit', importance_score=5,
        )
        candidates = recommend._build_candidate_slots(self.user, duration_minutes=60)

        with patch.object(recommend, '_rank_slots_with_ai', side_effect=Exception('boom')):
            slots = recommend.suggest_time_slots(self.user, [self.h1, self.h2], duration_minutes=60)

        self.assertEqual(slots, candidates[:2])
