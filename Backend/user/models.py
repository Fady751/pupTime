from django.db import models
from django.contrib.auth.models import AbstractUser


class InterestCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = 'Interest Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Interest(models.Model):
    title = models.CharField(max_length=255, unique=True)
    category = models.ForeignKey(
        InterestCategory,
        on_delete=models.CASCADE,
        related_name='interests',
    )

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title


class User(AbstractUser):
    google_auth_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)
    birth_day = models.DateField(null=True, blank=True)
    streak_cnt = models.IntegerField(default=0)
    joined_on = models.DateTimeField(auto_now_add=True)
    interests = models.ManyToManyField(
        Interest,
        through='UserInterest',
        related_name='users',
        blank=True,
    )

    def __str__(self):
        return self.username


class UserInterest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_interests')
    interest = models.ForeignKey(Interest, on_delete=models.CASCADE, related_name='user_interests')

    class Meta:
        unique_together = ('user', 'interest')
        verbose_name = 'User Interest'
        verbose_name_plural = 'User Interests'

    def __str__(self):
        return f"{self.user.username} - {self.interest.title}"