from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from user.models import User
from notification.models import Notification, NotificationType

class NotificationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='password')
        self.client.force_authenticate(user=self.user)
        self.notification = Notification.objects.create(
            receiver=self.user,
            type=NotificationType.FRIEND_REQUEST,
            data={'message': 'test message'}
        )

    def test_list_notifications(self):
        url = reverse('notification-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Paginated response
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)

    def test_mark_as_read(self):
        url = reverse('notification-mark-as-read')
        response = self.client.post(url, {'notification_id': self.notification.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)

    def test_count_unread(self):
        url = reverse('notification-unread-count')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 1)
