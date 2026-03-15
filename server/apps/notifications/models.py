from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        MENTION = 'mention', 'Mention'
        DM = 'dm', 'Direct Message'
        REPLY = 'reply', 'Reply'
        REACTION = 'reaction', 'Reaction'
        INVITE = 'invite', 'Invite'
        SYSTEM = 'system', 'System'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    reference_type = models.CharField(max_length=50, blank=True)
    reference_id = models.BigIntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
        ]


class AuditLog(models.Model):
    workspace = models.ForeignKey(
        'workspaces.Workspace', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='audit_logs'
    )
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=100)
    target_type = models.CharField(max_length=50, blank=True)
    target_id = models.BigIntegerField(null=True, blank=True)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['workspace', 'created_at']),
        ]
