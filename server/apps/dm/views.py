"""Direct Message (DM) APIs.

Highlights:
- 1:1 thread creation is idempotent
- messages are paginated by cursor
- realtime emits both thread-level and user-level events
  so recipients discover new threads instantly
"""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import CursorPagination
from django.http import Http404

from apps.messaging.models import Message, PinnedMessage
from apps.messaging.serializers import MessageSerializer, MessageCreateSerializer, PinnedMessageSerializer
from .models import DMThread, DMParticipant
from .serializers import DMThreadSerializer, DMThreadCreateSerializer
from realtime.sse import publish_event


class DMThreadListView(generics.ListAPIView):
    serializer_class = DMThreadSerializer

    def get_queryset(self):
        return DMThread.objects.filter(
            participants__user=self.request.user
        ).prefetch_related('participants', 'participants__user', 'participants__user__profile').distinct()


class DMThreadCreateView(APIView):
    def post(self, request):
        serializer = DMThreadCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_ids = serializer.validated_data['user_ids']
        name = serializer.validated_data.get('name', '')
        is_group = len(user_ids) > 1

        # For 1:1 DM, check if thread already exists
        if not is_group:
            other_id = user_ids[0]
            existing = DMThread.objects.filter(
                is_group=False,
                participants__user=request.user,
            ).filter(
                participants__user_id=other_id,
            ).first()
            if existing:
                return Response(
                    DMThreadSerializer(existing, context={'request': request}).data,
                    status=200,
                )

        thread = DMThread.objects.create(is_group=is_group, name=name)
        DMParticipant.objects.create(thread=thread, user=request.user)
        for uid in user_ids:
            if uid != request.user.id:
                DMParticipant.objects.create(thread=thread, user_id=uid)

        return Response(
            DMThreadSerializer(thread, context={'request': request}).data,
            status=201,
        )


class DMMessageCursorPagination(CursorPagination):
    page_size = 50
    ordering = '-created_at'


class DMMessageListView(generics.ListCreateAPIView):
    pagination_class = DMMessageCursorPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MessageCreateSerializer
        return MessageSerializer

    def get_queryset(self):
        thread_id = self.kwargs['thread_id']
        if not DMParticipant.objects.filter(thread_id=thread_id, user=self.request.user).exists():
            return Message.objects.none()
        return Message.objects.filter(
            dm_thread_id=thread_id, is_deleted=False,
        ).select_related('user', 'user__profile', 'reply_to', 'reply_to__user').prefetch_related('reactions', 'attachments')

    def perform_create(self, serializer):
        thread_id = self.kwargs['thread_id']
        if not DMParticipant.objects.filter(thread_id=thread_id, user=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Not a participant.')
        message = serializer.save(user=self.request.user, dm_thread_id=thread_id)
        # Keep thread ordering fresh in conversation sidebar.
        DMThread.objects.filter(id=thread_id).update(updated_at=message.created_at)
        # Sender immediately marks the new message as read for self.
        DMParticipant.objects.filter(
            thread_id=thread_id, user=self.request.user
        ).update(last_read_message_id=message.id)
        serialized_message = MessageSerializer(message, context={'request': self.request}).data

        # Publish to participants currently subscribed to this DM thread.
        publish_event(f'dm_{thread_id}', 'message.created', {
            'message': serialized_message,
        })

        # Also publish to user-scoped channels. This guarantees recipient
        # thread discovery even if they subscribed before thread existed.
        recipient_ids = DMParticipant.objects.filter(
            thread_id=thread_id,
        ).exclude(user=self.request.user).values_list('user_id', flat=True)
        for user_id in recipient_ids:
            publish_event(f'user_{user_id}', 'dm.message.created', {
                'thread_id': thread_id,
                'message': serialized_message,
            })
        self._created_message = message

    def create(self, request, *args, **kwargs):
        """Override to return full MessageSerializer response."""
        response = super().create(request, *args, **kwargs)
        message = self._created_message
        full_data = MessageSerializer(message, context={'request': request}).data
        response.data = full_data
        return response


class DMMessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MessageSerializer

    def get_queryset(self):
        return Message.objects.filter(
            dm_thread_id=self.kwargs['thread_id'], is_deleted=False,
        )

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only edit your own messages.')
        serializer.save(is_edited=True)

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete your own messages.')
        thread_id = self.kwargs['thread_id']
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])
        PinnedMessage.objects.filter(dm_thread_id=thread_id, message_id=instance.id).delete()
        publish_event(f'dm_{thread_id}', 'dm.message.deleted', {
            'thread_id': thread_id,
            'message_id': instance.id,
        })


class DMPinView(APIView):
    def post(self, request, thread_id, message_id):
        if not DMParticipant.objects.filter(thread_id=thread_id, user=request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Not a participant.')

        message = Message.objects.filter(
            id=message_id,
            dm_thread_id=thread_id,
            is_deleted=False,
        ).first()
        if not message:
            raise Http404('Message not found in this thread.')

        if PinnedMessage.objects.filter(dm_thread_id=thread_id, message_id=message_id).exists():
            return Response({'detail': 'Already pinned.'}, status=400)

        pin = PinnedMessage.objects.create(
            message=message,
            dm_thread_id=thread_id,
            pinned_by=request.user,
        )
        publish_event(f'dm_{thread_id}', 'dm.message.pinned', {
            'thread_id': thread_id,
            'message_id': message_id,
            'pinned_by': request.user.id,
        })
        return Response(PinnedMessageSerializer(pin, context={'request': request}).data, status=201)

    def delete(self, request, thread_id, message_id):
        if not DMParticipant.objects.filter(thread_id=thread_id, user=request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Not a participant.')

        message_exists = Message.objects.filter(
            id=message_id,
            dm_thread_id=thread_id,
            is_deleted=False,
        ).exists()
        if not message_exists:
            raise Http404('Message not found in this thread.')

        PinnedMessage.objects.filter(dm_thread_id=thread_id, message_id=message_id).delete()
        publish_event(f'dm_{thread_id}', 'dm.message.unpinned', {
            'thread_id': thread_id,
            'message_id': message_id,
        })
        return Response(status=204)


class DMPinnedMessageListView(generics.ListAPIView):
    serializer_class = PinnedMessageSerializer

    def get_queryset(self):
        thread_id = self.kwargs['thread_id']
        if not DMParticipant.objects.filter(thread_id=thread_id, user=self.request.user).exists():
            return PinnedMessage.objects.none()
        return PinnedMessage.objects.filter(
            dm_thread_id=thread_id,
            message__dm_thread_id=thread_id,
            message__is_deleted=False,
        ).select_related('message', 'message__user', 'message__user__profile').prefetch_related('message__attachments').order_by('-created_at')


class DMTypingView(APIView):
    def post(self, request, thread_id):
        if not DMParticipant.objects.filter(thread_id=thread_id, user=request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Not a participant.')
        publish_event(f'dm_{thread_id}', 'dm.typing.start', {
            'thread_id': thread_id,
            'user_id': request.user.id,
            'username': request.user.username,
        })
        return Response(status=204)


class DMThreadReadView(APIView):
    def post(self, request, thread_id):
        participant = DMParticipant.objects.filter(
            thread_id=thread_id,
            user=request.user,
        ).first()
        if not participant:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Not a participant.')

        latest_message_id = Message.objects.filter(
            dm_thread_id=thread_id,
            is_deleted=False,
        ).order_by('-id').values_list('id', flat=True).first()

        if latest_message_id:
            participant.last_read_message_id = latest_message_id
            participant.save(update_fields=['last_read_message_id'])

        return Response(
            {
                'thread_id': thread_id,
                'last_read_message_id': latest_message_id,
                'unread_count': 0,
            },
            status=status.HTTP_200_OK,
        )
