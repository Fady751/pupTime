import uuid
from django.db import models
from user.models import User, InterestCategory

class TaskTemplate(models.Model):
    PRIORITY_NONE = 'none'
    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'
    PRIORITY_CHOICES = [
        (PRIORITY_NONE, 'None'),
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_MEDIUM, 'Medium'),
        (PRIORITY_HIGH, 'High'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    categories = models.ManyToManyField(InterestCategory, blank=True, related_name='tasks')
    
    title = models.CharField(max_length=255)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_NONE)
    emoji = models.CharField(max_length=8, blank=True, default='')
    
    start_datetime = models.DateTimeField(help_text="When the task starts, or the FIRST instance of a series.")
    reminder_time = models.DateTimeField(null=True, blank=True, help_text="Optional reminder date for the task.")
    duration_minutes = models.IntegerField(null=True, blank=True, help_text="Duration of the task in minutes.")
    is_recurring = models.BooleanField(default=False)
    rrule = models.CharField(
        max_length=255, 
        null=True, 
        blank=True, 
        help_text="The recurrence rule. e.g., 'FREQ=DAILY;UNTIL=20301231T235959Z'"
    )
    timezone = models.CharField(max_length=64, default='UTC', help_text="e.g., 'Africa/Cairo'")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")

    def __str__(self):
        return f"{self.title} ({self.id})"


class TaskOverride(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_SKIPPED = 'SKIPPED'
    STATUS_RESCHEDULED = 'RESCHEDULED'
    STATUS_FAILED = 'FAILED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_SKIPPED, 'Skipped'),
        (STATUS_RESCHEDULED, 'Rescheduled'),
        (STATUS_FAILED, 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    task = models.ForeignKey(TaskTemplate, on_delete=models.CASCADE, related_name='overrides')
    
    instance_datetime = models.DateTimeField(help_text="The exact timestamp this specific instance was originally scheduled for.")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=STATUS_PENDING)
    new_datetime = models.DateTimeField(null=True, blank=True, help_text="Used only if status is 'RESCHEDULED'.")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")

    class Meta:
        unique_together = ('task', 'instance_datetime')
        indexes = [
            models.Index(fields=['task', 'instance_datetime']),
        ]

    def __str__(self):
        return f"{self.task.title} - {self.instance_datetime.strftime('%Y-%m-%d %H:%M')} ({self.status})"