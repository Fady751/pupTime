from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, post_delete
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from friendship.models import Friendship, Status
from hobby.models import Hobby, HobbyRecommendation, hobby_changed_handler

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
