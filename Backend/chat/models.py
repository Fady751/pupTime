from django.db import models
from django.conf import settings

class ChatRoom(models.Model):
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='chatrooms')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Room {self.id} with {self.users.count()} users"

class Message(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender} in {self.room}: {self.content[:20]}"
