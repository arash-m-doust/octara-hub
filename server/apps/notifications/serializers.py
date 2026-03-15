from rest_framework import serializers
from .models import Notification, AuditLog


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'body', 'reference_type', 'reference_id', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, default='')

    class Meta:
        model = AuditLog
        fields = ['id', 'workspace', 'user', 'username', 'action', 'target_type', 'target_id', 'details', 'ip_address', 'created_at']
        read_only_fields = ['id', 'created_at']
