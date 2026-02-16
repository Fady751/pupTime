from django.db import models
from user.models import User, InterestCategory


class Task(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_COMPLETED = 'completed'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_COMPLETED, 'Completed'),
    ]

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

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    categories = models.ManyToManyField(InterestCategory, blank=True, related_name='tasks')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    reminder_time = models.IntegerField(null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_NONE)
    emoji = models.CharField(max_length=8, blank=True, default='')

    def __str__(self):
        return f"{self.title} ({self.user_id})"


class TaskRepetition(models.Model):
    FREQUENCY_ONCE = 'once'
    FREQUENCY_DAILY = 'daily'
    FREQUENCY_WEEKLY = 'weekly'
    FREQUENCY_MONTHLY = 'monthly'
    FREQUENCY_YEARLY = 'yearly'
    FREQUENCY_SUNDAY = 'sunday'
    FREQUENCY_MONDAY = 'monday'
    FREQUENCY_TUESDAY = 'tuesday'
    FREQUENCY_WEDNESDAY = 'wednesday'
    FREQUENCY_THURSDAY = 'thursday'
    FREQUENCY_FRIDAY = 'friday'
    FREQUENCY_SATURDAY = 'saturday'

    FREQUENCY_CHOICES = [
        (FREQUENCY_ONCE, 'Once'),
        (FREQUENCY_DAILY, 'Daily'),
        (FREQUENCY_WEEKLY, 'Weekly'),
        (FREQUENCY_MONTHLY, 'Monthly'),
        (FREQUENCY_YEARLY, 'Yearly'),
        (FREQUENCY_SUNDAY, 'Sunday'),
        (FREQUENCY_MONDAY, 'Monday'),
        (FREQUENCY_TUESDAY, 'Tuesday'),
        (FREQUENCY_WEDNESDAY, 'Wednesday'),
        (FREQUENCY_THURSDAY, 'Thursday'),
        (FREQUENCY_FRIDAY, 'Friday'),
        (FREQUENCY_SATURDAY, 'Saturday'),
    ]

    id = models.AutoField(primary_key=True)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='repetitions')
    frequency = models.CharField(max_length=16, choices=FREQUENCY_CHOICES)
    time = models.TimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.task_id} - {self.frequency} @ {self.time}" if self.time else f"{self.task_id} - {self.frequency}"