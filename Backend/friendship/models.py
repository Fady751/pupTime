from django.db import models
from django.utils import timezone
from user.models import User

class Status(models.IntegerChoices):
        PENDING  = 0 , "pending"
        ACCEPTED = 1 , "accepted"
        CANCELLED = 2 , "canceled"
        BLOCKED = 3 , "blocked"

class Friendship(models.Model):
    sender = models.ForeignKey(User, related_name='sender', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='receiver', on_delete=models.CASCADE)
    blocked_by = models.ForeignKey(User, related_name='blocked_by',
                                    null=True, blank=True, on_delete=models.SET_NULL)

    sent_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    status = models.IntegerField(
        choices=Status.choices,
        default=Status.PENDING
    )

    class Meta:
        unique_together = ('sender', 'receiver')
        ordering = ['sent_at']