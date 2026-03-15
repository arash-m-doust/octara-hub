from rest_framework import serializers
from .models import Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            'id', 'message', 'user', 'workspace', 'original_filename',
            'mime_type', 'file_size', 'checksum', 'created_at',
            'download_url', 'preview_url',
        ]
        read_only_fields = ['id', 'user', 'stored_path', 'checksum', 'created_at']

    def get_download_url(self, obj):
        return f'/api/files/{obj.id}/'

    def get_preview_url(self, obj):
        if obj.preview_path:
            return f'/api/files/{obj.id}/preview/'
        return None
