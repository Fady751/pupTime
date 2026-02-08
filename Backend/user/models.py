from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    google_auth_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)
    birth_day = models.DateField(null=True, blank=True)
    streak_cnt = models.IntegerField(default=0)
    joined_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username