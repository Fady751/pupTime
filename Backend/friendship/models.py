from django.db import models

from user.models import User

# Create your models here.

class Status(models.IntegerChoices):
        PENDING  = 0 , "pending"
        ACCEPTED = 1 , "accepted"
        CANCELLED = 2 , "canceled"
        BLOCKED = 3 , "blocked"

class Friendship(models.Model):
    sender = models.ForeignKey(User, related_name='sender', on_delete=models.CASCADE , unique=True)
    receiver = models.ForeignKey(User, related_name='receiver', on_delete=models.CASCADE , unique=True)
    blocked_by = models.ForeignKey(User, related_name='blocked_by', null = True, blank = True, on_delete=models.SET_NULL)
    sent_at = models.DateTimeField(auto_now_add = True , null = False)
    accepted_at = models.DateTimeField(auto_now_add = True , null = True , blank = True)
    status = models.IntegerField(
        choices=Status.choices,
        default=Status.PENDING
    )

    class Meta:
        unique_together = ('sender', 'receiver')
        ordering = ['sent_at']

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.get_status_display()})"