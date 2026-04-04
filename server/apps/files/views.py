import mimetypes
from pathlib import Path
from django.http import FileResponse, Http404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser

from apps.messaging.models import Message
from apps.messaging.serializers import MessageSerializer
from apps.workspaces.models import Channel, ChannelMember, WorkspaceMember
from apps.dm.models import DMParticipant, DMThread
from realtime.sse import publish_event
from .models import Attachment
from .serializers import AttachmentSerializer
from .storage import (
    get_channel_upload_path,
    get_dm_upload_path,
    save_uploaded_file,
    delete_file,
    is_office_document,
    generate_office_preview,
)


class FileUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided.'}, status=400)

        channel_id = request.data.get('channel_id')
        dm_thread_id = request.data.get('dm_thread_id')
        message_content = request.data.get('message', '')
        workspace_id = None

        if channel_id in ('', None):
            channel_id = None
        else:
            try:
                channel_id = int(channel_id)
            except (TypeError, ValueError):
                return Response({'detail': 'channel_id must be an integer.'}, status=400)

        if dm_thread_id in ('', None):
            dm_thread_id = None
        else:
            try:
                dm_thread_id = int(dm_thread_id)
            except (TypeError, ValueError):
                return Response({'detail': 'dm_thread_id must be an integer.'}, status=400)

        # Determine storage path and create message
        if channel_id:
            channel = Channel.objects.select_related('workspace').filter(id=channel_id).first()
            if not channel:
                return Response({'detail': 'Channel not found.'}, status=404)
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

        if is_office_document(mime, file.name):
            preview_path = generate_office_preview(Path(attachment.stored_path))
            if preview_path:
                attachment.preview_path = str(preview_path)
                attachment.save(update_fields=['preview_path'])

        serialized_message = MessageSerializer(message, context={'request': request}).data

        if message.channel_id:
            ChannelMember.objects.filter(
                channel_id=message.channel_id,
                user=request.user,
            ).update(last_read_message_id=message.id)
            publish_event(f'channel_{message.channel_id}', 'message.created', {
                'message': serialized_message,
            })
        elif message.dm_thread_id:
            DMThread.objects.filter(id=message.dm_thread_id).update(updated_at=message.created_at)
            DMParticipant.objects.filter(
                thread_id=message.dm_thread_id,
                user=request.user,
            ).update(last_read_message_id=message.id)
            publish_event(f'dm_{message.dm_thread_id}', 'message.created', {
                'message': serialized_message,
            })
            recipient_ids = DMParticipant.objects.filter(
                thread_id=message.dm_thread_id,
            ).exclude(user=request.user).values_list('user_id', flat=True)
            for user_id in recipient_ids:
                publish_event(f'user_{user_id}', 'dm.message.created', {
                    'thread_id': message.dm_thread_id,
                    'message': serialized_message,
                })

        return Response(AttachmentSerializer(attachment).data, status=201)


class FileDownloadView(APIView):
    """Download a file. Also supports ?token= query param for direct download links."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            attachment = Attachment.objects.select_related('message', 'message__channel', 'message__channel__workspace').get(id=pk)
        except Attachment.DoesNotExist:
            raise Http404

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
    """Serve file preview/thumbnail. Allows unauthenticated access for img src tags."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            attachment = Attachment.objects.get(id=pk)
        except Attachment.DoesNotExist:
            raise Http404

        if attachment.preview_path and Path(attachment.preview_path).exists():
            preview_mime = mimetypes.guess_type(attachment.preview_path)[0] or 'application/octet-stream'
            return FileResponse(
                open(attachment.preview_path, 'rb'),
                content_type=preview_mime,
            )

        # Lazy preview generation helps previously uploaded Office files
        # that were created before preview conversion existed.
        if is_office_document(attachment.mime_type, attachment.original_filename):
            generated_preview = generate_office_preview(Path(attachment.stored_path))
            if generated_preview and generated_preview.exists():
                attachment.preview_path = str(generated_preview)
                attachment.save(update_fields=['preview_path'])
                preview_mime = mimetypes.guess_type(str(generated_preview))[0] or 'application/octet-stream'
                return FileResponse(
                    open(generated_preview, 'rb'),
                    content_type=preview_mime,
                )

        # For images, serve the original as preview
        if attachment.mime_type.startswith('image/'):
            file_path = Path(attachment.stored_path)
            if file_path.exists():
                return FileResponse(
                    open(file_path, 'rb'),
                    content_type=attachment.mime_type,
                )

        # PDFs are previewable in-browser through the same endpoint.
        if 'pdf' in attachment.mime_type:
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
