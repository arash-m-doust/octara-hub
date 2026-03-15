from django.db import models
from django.contrib.auth.models import User


class DMThread(models.Model):
    is_group = models.BooleanField(default=False)
    name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.name:
            return self.name
        usernames = ', '.join(p.user.username for p in self.participants.all()[:3])
        return f'DM: {usernames}'

    class Meta:
        db_table = 'dm_threads'


class DMParticipant(models.Model):
    thread = models.ForeignKey(DMThread, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dm_participations')
    last_read_message_id = models.BigIntegerField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'dm_participants'
        unique_together = ['thread', 'user']
