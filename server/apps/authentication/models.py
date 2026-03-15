from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    class Status(models.TextChoices):
        ONLINE = 'online', 'Online'
        IDLE = 'idle', 'Idle'
        DND = 'dnd', 'Do Not Disturb'
        OFFLINE = 'offline', 'Offline'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=100, blank=True)
    avatar_path = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OFFLINE)
    locale = models.CharField(max_length=5, default='en')
    theme = models.CharField(max_length=20, default='light')
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.display_name or self.user.username

    class Meta:
        db_table = 'user_profiles'
