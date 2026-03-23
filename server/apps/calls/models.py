from django.db import models
from django.contrib.auth.models import User


class CallSession(models.Model):
    """Active or historical call session."""
    CALL_TYPE_CHOICES = [
        ('voice', 'Voice'),
        ('video', 'Video'),
    ]
    STATUS_CHOICES = [
        ('ringing', 'Ringing'),
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('missed', 'Missed'),
        ('declined', 'Declined'),
    ]

    channel = models.ForeignKey(
        'workspaces.Channel', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='calls'
    )
    dm_thread = models.ForeignKey(
        'dm.DMThread', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='calls'
    )
    initiator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='initiated_calls')
    call_type = models.CharField(max_length=10, choices=CALL_TYPE_CHOICES, default='voice')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ringing')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'call_sessions'
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.call_type} call by {self.initiator.username} ({self.status})'


class CallParticipant(models.Model):
    """Tracks who is in a call."""
    call = models.ForeignKey(CallSession, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='call_participations')
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    is_muted = models.BooleanField(default=False)
    is_video_off = models.BooleanField(default=False)

    class Meta:
        db_table = 'call_participants'
        unique_together = ['call', 'user']
