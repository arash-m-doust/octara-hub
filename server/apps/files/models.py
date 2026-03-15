from django.db import models
from django.contrib.auth.models import User


class Attachment(models.Model):
    message = models.ForeignKey(
        'messaging.Message', on_delete=models.CASCADE, related_name='attachments'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attachments')
    workspace = models.ForeignKey(
        'workspaces.Workspace', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='attachments'
    )
    original_filename = models.CharField(max_length=255)
    stored_path = models.CharField(max_length=500)
    mime_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField()
    checksum = models.CharField(max_length=64, blank=True)
    preview_path = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_filename

    class Meta:
        db_table = 'attachments'
        indexes = [
            models.Index(fields=['message']),
            models.Index(fields=['workspace']),
        ]
