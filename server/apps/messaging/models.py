from django.db import models
from django.contrib.auth.models import User


class Message(models.Model):
    channel = models.ForeignKey(
        'workspaces.Channel', on_delete=models.CASCADE,
        null=True, blank=True, related_name='messages'
    )
    dm_thread = models.ForeignKey(
        'dm.DMThread', on_delete=models.CASCADE,
        null=True, blank=True, related_name='messages'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages')
    content = models.TextField()
    reply_to = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies'
    )
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        preview = self.content[:50] if self.content else ''
        return f'{self.user.username}: {preview}'

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['channel', 'created_at']),
            models.Index(fields=['dm_thread', 'created_at']),
            models.Index(fields=['user']),
        ]


class MessageReaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'message_reactions'
        unique_together = ['message', 'user', 'emoji']


class PinnedMessage(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='pins')
    channel = models.ForeignKey(
        'workspaces.Channel', on_delete=models.CASCADE,
        null=True, blank=True, related_name='pinned_messages'
    )
    dm_thread = models.ForeignKey(
        'dm.DMThread', on_delete=models.CASCADE,
        null=True, blank=True, related_name='pinned_messages'
    )
    pinned_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pinned_messages'
