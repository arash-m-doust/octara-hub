import secrets
from django.db import models
from django.contrib.auth.models import User


class Workspace(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon_path = models.CharField(max_length=500, blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_workspaces')
    invite_code = models.CharField(max_length=20, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.invite_code:
            self.invite_code = secrets.token_urlsafe(12)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'workspaces'


class Role(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='roles')
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, blank=True)
    is_default = models.BooleanField(default=False)
    position = models.IntegerField(default=0)
    permissions = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} ({self.workspace.name})'

    class Meta:
        db_table = 'roles'
        ordering = ['position']


class WorkspaceMember(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workspace_memberships')
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    nickname = models.CharField(max_length=100, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} in {self.workspace.name}'

    class Meta:
        db_table = 'workspace_members'
        unique_together = ['workspace', 'user']


class Category(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'categories'
        ordering = ['position']
        verbose_name_plural = 'categories'


class Channel(models.Model):
    class ChannelType(models.TextChoices):
        TEXT = 'text', 'Text'
        ANNOUNCEMENT = 'announcement', 'Announcement'

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='channels')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='channels')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=15, choices=ChannelType.choices, default=ChannelType.TEXT)
    is_private = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'#{self.name}'

    class Meta:
        db_table = 'channels'
        ordering = ['position']


class ChannelMember(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='channel_memberships')
    last_read_message_id = models.BigIntegerField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'channel_members'
        unique_together = ['channel', 'user']
