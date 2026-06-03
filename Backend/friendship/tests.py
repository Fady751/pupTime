from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from user.models import User
from friendship.models import Friendship, Status

class FriendshipTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', email='user1@example.com', password='password')
        self.user2 = User.objects.create_user(username='user2', email='user2@example.com', password='password')
        self.client.force_authenticate(user=self.user1)

    def test_friendship_request_success(self):
        url = reverse('friendship-request', kwargs={'user_id': self.user2.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Friendship.objects.filter(sender=self.user1, receiver=self.user2).exists())

    def test_friendship_request_already_exists(self):
        Friendship.objects.create(sender=self.user1, receiver=self.user2, status=Status.PENDING)
        url = reverse('friendship-request', kwargs={'user_id': self.user2.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_friendship_accept_success(self):
        friendship = Friendship.objects.create(sender=self.user2, receiver=self.user1, status=Status.PENDING)
        url = reverse('friendship-accept', kwargs={'friendship_id': friendship.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        friendship.refresh_from_db()
        self.assertEqual(friendship.status, Status.ACCEPTED)

    def test_friendship_cancel_request(self):
        friendship = Friendship.objects.create(sender=self.user1, receiver=self.user2, status=Status.PENDING)
        url = reverse('friendship-cancel', kwargs={'friendship_id': friendship.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Friendship.objects.filter(id=friendship.id).exists())

    def test_block_user(self):
        url = reverse('friendship-block', kwargs={'user_id': self.user2.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        friendship = Friendship.objects.get(sender=self.user1, receiver=self.user2)
        self.assertEqual(friendship.status, Status.BLOCKED)
        self.assertEqual(friendship.blocked_by, self.user1)

    def test_unblock_user(self):
        Friendship.objects.create(sender=self.user1, receiver=self.user2, status=Status.BLOCKED, blocked_by=self.user1)
        url = reverse('friendship-unblock', kwargs={'user_id': self.user2.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Friendship.objects.filter(sender=self.user1, receiver=self.user2).exists())

    def test_friendship_status(self):
        Friendship.objects.create(sender=self.user1, receiver=self.user2, status=Status.ACCEPTED)
        url = reverse('friendship-status', kwargs={'user_id': self.user2.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Status.ACCEPTED)

    def test_unfriend(self):
        Friendship.objects.create(sender=self.user1, receiver=self.user2, status=Status.ACCEPTED)
        url = reverse('friendship-unfriend', kwargs={'user_id': self.user2.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Friendship.objects.filter(sender=self.user1, receiver=self.user2).exists())
