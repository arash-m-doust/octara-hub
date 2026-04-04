from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import CursorPagination
from django.http import Http404

from apps.workspaces.permissions import IsWorkspaceMember
from apps.workspaces.models import Channel, ChannelMember, WorkspaceMember
from .models import Message, MessageReaction, PinnedMessage
from .serializers import (
    MessageSerializer, MessageCreateSerializer,
    PinnedMessageSerializer,
)
from realtime.sse import publish_event


def can_moderate_channel_message(user, message: Message) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return True
    if message.user_id == user.id:
        return True

    channel = getattr(message, 'channel', None)
    if channel is None:
        channel = Channel.objects.select_related('workspace').filter(id=message.channel_id).first()
    if channel is None:
        return False

    membership = WorkspaceMember.objects.select_related('role').filter(
        workspace_id=channel.workspace_id,
        user=user,
    ).first()
    if membership is None:
        return False
    if channel.workspace.owner_id == user.id:
        return True

    permissions = membership.role.permissions if membership.role and membership.role.permissions else {}
    return bool(
        permissions.get('manage_messages')
        or permissions.get('manage_channels')
        or permissions.get('manage_workspace')
    )


class MessageCursorPagination(CursorPagination):
    page_size = 50
    ordering = '-created_at'
    cursor_query_param = 'cursor'


class ChannelMessageListView(generics.ListCreateAPIView):
    pagination_class = MessageCursorPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MessageCreateSerializer
        return MessageSerializer

    def get_queryset(self):
        return Message.objects.filter(
            channel_id=self.kwargs['channel_id'],
            is_deleted=False,
        ).select_related('user', 'user__profile', 'reply_to', 'reply_to__user').prefetch_related('reactions', 'attachments')

    def perform_create(self, serializer):
        channel_id = self.kwargs['channel_id']
        message = serializer.save(user=self.request.user, channel_id=channel_id)
        # Update last_read
        ChannelMember.objects.filter(
            channel_id=channel_id, user=self.request.user
        ).update(last_read_message_id=message.id)
        # Publish realtime event
        publish_event(f'channel_{channel_id}', 'message.created', {
            'message': MessageSerializer(message, context={'request': self.request}).data,
        })
        # Store for create response
        self._created_message = message

    def create(self, request, *args, **kwargs):
        """Override to return full MessageSerializer response (with user, reactions, etc.)."""
        response = super().create(request, *args, **kwargs)
        message = self._created_message
        full_data = MessageSerializer(message, context={'request': request}).data
        response.data = full_data
        return response


class MessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MessageSerializer

    def get_queryset(self):
        return Message.objects.filter(
            channel_id=self.kwargs['channel_id'],
            is_deleted=False,
        )

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user and not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only edit your own messages.')
        serializer.save(is_edited=True)
        publish_event(f'channel_{self.kwargs["channel_id"]}', 'message.updated', {
            'message_id': serializer.instance.id,
            'content': serializer.instance.content,
        })

    def perform_destroy(self, instance):
        if not can_moderate_channel_message(self.request.user, instance):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete your own messages.')
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])
        publish_event(f'channel_{self.kwargs["channel_id"]}', 'message.deleted', {
            'message_id': instance.id,
        })


class ReactionView(APIView):
    def post(self, request, channel_id, message_id):
        emoji = request.data.get('emoji')
        if not emoji:
            return Response({'detail': 'emoji required.'}, status=400)
        _, created = MessageReaction.objects.get_or_create(
            message_id=message_id, user=request.user, emoji=emoji,
        )
        if not created:
            return Response({'detail': 'Already reacted.'}, status=400)
        publish_event(f'channel_{channel_id}', 'reaction.added', {
            'message_id': message_id, 'emoji': emoji, 'user_id': request.user.id,
        })
        return Response({'detail': 'Reaction added.'}, status=201)

    def delete(self, request, channel_id, message_id):
        emoji = request.query_params.get('emoji') or request.data.get('emoji')
        deleted, _ = MessageReaction.objects.filter(
            message_id=message_id, user=request.user, emoji=emoji,
        ).delete()
        if deleted:
            publish_event(f'channel_{channel_id}', 'reaction.removed', {
                'message_id': message_id, 'emoji': emoji, 'user_id': request.user.id,
            })
        return Response(status=204)


class PinView(APIView):
    def post(self, request, channel_id, message_id):
        message = Message.objects.filter(
            id=message_id,
            channel_id=channel_id,
            is_deleted=False,
        ).first()
        if not message:
            raise Http404('Message not found in this channel.')

        if PinnedMessage.objects.filter(message_id=message_id, channel_id=channel_id).exists():
            return Response({'detail': 'Already pinned.'}, status=400)
        pin = PinnedMessage.objects.create(
            message=message, channel_id=channel_id, pinned_by=request.user,
        )
        publish_event(f'channel_{channel_id}', 'message.pinned', {
            'message_id': message_id,
            'channel_id': channel_id,
            'pinned_by': request.user.id,
        })
        return Response(PinnedMessageSerializer(pin).data, status=201)

    def delete(self, request, channel_id, message_id):
        message_exists = Message.objects.filter(
            id=message_id,
            channel_id=channel_id,
            is_deleted=False,
        ).exists()
        if not message_exists:
            raise Http404('Message not found in this channel.')
        PinnedMessage.objects.filter(message_id=message_id, channel_id=channel_id).delete()
        publish_event(f'channel_{channel_id}', 'message.unpinned', {
            'message_id': message_id,
            'channel_id': channel_id,
        })
        return Response(status=204)


class PinnedMessageListView(generics.ListAPIView):
    serializer_class = PinnedMessageSerializer

    def get_queryset(self):
        return PinnedMessage.objects.filter(
            channel_id=self.kwargs['channel_id'],
            message__channel_id=self.kwargs['channel_id'],
            message__is_deleted=False,
        ).select_related('message', 'message__user', 'message__user__profile').prefetch_related('message__attachments')


class TypingView(APIView):
    def post(self, request, channel_id):
        publish_event(f'channel_{channel_id}', 'typing.start', {
            'user_id': request.user.id,
            'username': request.user.username,
        })
        return Response(status=204)
