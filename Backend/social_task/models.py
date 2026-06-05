import uuid
from django.db import models
from django.core.exceptions import ValidationError
from user.models import User
from task.models import TaskTemplate


class SocialTaskStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    CONFIRMED = 'confirmed', 'Confirmed'
    CANCELLED = 'cancelled', 'Cancelled'


class ParticipantStatus(models.TextChoices):
    INVITED = 'invited', 'Invited'
    ACCEPTED = 'accepted', 'Accepted'
    DECLINED = 'declined', 'Declined'


class SocialTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE, related_name='sub_tasks'
    )
    initiator = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='initiated_social_tasks'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    duration_minutes = models.PositiveIntegerField()
    scheduled_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=SocialTaskStatus.choices, default=SocialTaskStatus.DRAFT
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.id})"

    @property
    def root(self):
        return self if self.parent is None else self.parent

    def clean(self):
        if self.parent and self.parent.parent_id is not None:
            raise ValidationError("Sub-tasks cannot be nested more than 1 level deep.")


class SocialTaskParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    social_task = models.ForeignKey(
        SocialTask, on_delete=models.CASCADE, related_name='participants'
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='social_task_participations'
    )
    status = models.CharField(
        max_length=10, choices=ParticipantStatus.choices, default=ParticipantStatus.INVITED
    )
    rsvp_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('social_task', 'user')

    def __str__(self):
        return f"{self.user.username} in {self.social_task.title} ({self.status})"


class SocialTaskNodeTask(models.Model):
    """Links a tree node to the personal TaskTemplate created for a specific participant."""
    node = models.ForeignKey(
        SocialTask, on_delete=models.CASCADE, related_name='node_tasks'
    )
    participant = models.ForeignKey(
        SocialTaskParticipant, on_delete=models.CASCADE, related_name='node_tasks'
    )
    task = models.OneToOneField(
        TaskTemplate, on_delete=models.CASCADE, related_name='social_node_task'
    )

    class Meta:
        unique_together = ('node', 'participant')

    def __str__(self):
        return f"{self.node.title} → {self.participant.user.username}"
