from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from user.models import User
from chat.models import ChatRoom, Message

class ChatTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', email='user1@example.com', password='password')
        self.user2 = User.objects.create_user(username='user2', email='user2@example.com', password='password')
        self.client.force_authenticate(user=self.user1)

    def test_create_chatroom(self):
        url = reverse('chatroom-list')
        response = self.client.post(url, {'user_id': self.user2.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ChatRoom.objects.filter(users=self.user1).filter(users=self.user2).exists())

    def test_list_chatrooms(self):
        room = ChatRoom.objects.create()
        room.users.add(self.user1, self.user2)
        url = reverse('chatroom-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Paginated response
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)

    def test_get_messages(self):
        room = ChatRoom.objects.create()
        room.users.add(self.user1, self.user2)
        Message.objects.create(room=room, sender=self.user1, content='hello')
        url = reverse('chatroom-messages', kwargs={'pk': room.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Paginated response
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['content'], 'hello')

    def test_add_user_to_room(self):
        room = ChatRoom.objects.create()
        room.users.add(self.user1)
        url = reverse('chatroom-add-user', kwargs={'pk': room.pk})
        response = self.client.post(url, {'user_id': self.user2.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.user2, room.users.all())
