from django.db import models
from .models import User , Friendship , Task

class NotificationType(models.TextChoices):
    FRIEND_REQUEST = 'FR', 'Friend_Request'
    FRIEND_ACCEPTED = 'FA', 'Friend_Accepted'
    INVITATION = 'IN', 'Invitation'
    REPORT = 'RP', 'Report'
    MESSAGE = 'MS', 'Message'



class Notification(models.Model):
    receiver = models.ForeignKey(User , on_delete=models.CASCADE, related_name='notifications')
    is_read = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    type = models.CharField(max_length=2, choices=NotificationType.choices)
    data = models.JSONField()

    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['receiver', 'is_read']),
            models.Index(fields=['receiver', 'is_sent']),
        ]

    def __str__(self):
        return f"Notification for {self.receiver.username} - Type: {self.get_type_display()} - Read: {self.is_read}"
    
