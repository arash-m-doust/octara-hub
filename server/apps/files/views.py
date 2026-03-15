import mimetypes
from pathlib import Path
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser

from apps.messaging.models import Message
from apps.workspaces.models import Channel, ChannelMember, WorkspaceMember
from apps.dm.models import DMParticipant
from .models import Attachment
from .serializers import AttachmentSerializer
from .storage import get_channel_upload_path, get_dm_upload_path, save_uploaded_file, delete_file


class FileUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided.'}, status=400)

        if file.size > settings.MAX_UPLOAD_SIZE:
            return Response({'detail': 'File too large.'}, status=400)

        channel_id = request.data.get('channel_id')
        dm_thread_id = request.data.get('dm_thread_id')
        message_content = request.data.get('message', '')

        # Determine storage path and create message
        if channel_id:
            channel = Channel.objects.select_related('workspace').get(id=channel_id)
            workspace_id = channel.workspace_id
            # Check membership
            if not WorkspaceMember.objects.filter(
                workspace_id=workspace_id, user=request.user
            ).exists():
                return Response({'detail': 'Not a member.'}, status=403)
            dest_path = get_channel_upload_path(workspace_id, channel_id, file.name)
            message = Message.objects.create(
                channel_id=channel_id, user=request.user,
                content=message_content or f'📎 {file.name}',
            )
        elif dm_thread_id:
            if not DMParticipant.objects.filter(
                thread_id=dm_thread_id, user=request.user
            ).exists():
                return Response({'detail': 'Not a participant.'}, status=403)
            workspace_id = None
            dest_path = get_dm_upload_path(request.user.id, dm_thread_id, file.name)
            message = Message.objects.create(
                dm_thread_id=dm_thread_id, user=request.user,
                content=message_content or f'📎 {file.name}',
            )
        else:
            return Response({'detail': 'channel_id or dm_thread_id required.'}, status=400)

        checksum = save_uploaded_file(file, dest_path)
        mime = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'

        attachment = Attachment.objects.create(
            message=message,
            user=request.user,
            workspace_id=workspace_id if channel_id else None,
            original_filename=file.name,
            stored_path=str(dest_path),
            mime_type=mime,
            file_size=file.size,
            checksum=checksum,
        )

        return Response(AttachmentSerializer(attachment).data, status=201)


class FileDownloadView(APIView):
    def get(self, request, pk):
        try:
            attachment = Attachment.objects.select_related('message').get(id=pk)
        except Attachment.DoesNotExist:
            raise Http404

        # Permission check
        msg = attachment.message
        if msg.channel_id:
            if not WorkspaceMember.objects.filter(
                workspace=msg.channel.workspace, user=request.user
            ).exists():
                return Response({'detail': 'Access denied.'}, status=403)
        elif msg.dm_thread_id:
            if not DMParticipant.objects.filter(
                thread_id=msg.dm_thread_id, user=request.user
            ).exists():
                return Response({'detail': 'Access denied.'}, status=403)

        file_path = Path(attachment.stored_path)
        if not file_path.exists():
            raise Http404

        return FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=attachment.original_filename,
            content_type=attachment.mime_type,
        )


class FilePreviewView(APIView):
    def get(self, request, pk):
        try:
            attachment = Attachment.objects.get(id=pk)
        except Attachment.DoesNotExist:
            raise Http404

        if attachment.preview_path and Path(attachment.preview_path).exists():
            return FileResponse(
                open(attachment.preview_path, 'rb'),
                content_type='image/jpeg',
            )

        # For images, serve the original as preview
        if attachment.mime_type.startswith('image/'):
            file_path = Path(attachment.stored_path)
            if file_path.exists():
                return FileResponse(
                    open(file_path, 'rb'),
                    content_type=attachment.mime_type,
                )

        raise Http404


class ChannelFilesView(generics.ListAPIView):
    serializer_class = AttachmentSerializer

    def get_queryset(self):
        return Attachment.objects.filter(
            message__channel_id=self.kwargs['channel_id']
        ).order_by('-created_at')


class DMFilesView(generics.ListAPIView):
    serializer_class = AttachmentSerializer

    def get_queryset(self):
        thread_id = self.kwargs['thread_id']
        if not DMParticipant.objects.filter(
            thread_id=thread_id, user=self.request.user
        ).exists():
            return Attachment.objects.none()
        return Attachment.objects.filter(
            message__dm_thread_id=thread_id
        ).order_by('-created_at')


class FileDeleteView(APIView):
    def delete(self, request, pk):
        try:
            attachment = Attachment.objects.get(id=pk, user=request.user)
        except Attachment.DoesNotExist:
            return Response({'detail': 'Not found or not owner.'}, status=404)
        delete_file(attachment.stored_path)
        if attachment.preview_path:
            delete_file(attachment.preview_path)
        attachment.delete()
        return Response(status=204)
