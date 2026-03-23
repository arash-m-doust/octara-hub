from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import CallSession, CallParticipant
from .serializers import CallSessionSerializer
from realtime.sse import publish_event
from apps.authentication.serializers import UserSerializer


class StartCallView(APIView):
    """Start a new call in a channel or DM thread."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        channel_id = request.data.get('channel_id')
        dm_thread_id = request.data.get('dm_thread_id')
        call_type = request.data.get('call_type', 'voice')

        if not channel_id and not dm_thread_id:
            return Response({'detail': 'channel_id or dm_thread_id required.'}, status=status.HTTP_400_BAD_REQUEST)

        if call_type not in ('voice', 'video'):
            return Response({'detail': 'call_type must be voice or video.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check for existing active call in the same context
        existing_filter = {'status__in': ['ringing', 'active']}
        if channel_id:
            existing_filter['channel_id'] = channel_id
        else:
            existing_filter['dm_thread_id'] = dm_thread_id
        existing = CallSession.objects.filter(**existing_filter).first()

        if existing:
            # Join existing call instead
            participant, created = CallParticipant.objects.get_or_create(
                call=existing, user=request.user,
                defaults={'is_muted': False, 'is_video_off': call_type == 'voice'},
            )
            if existing.status == 'ringing':
                existing.status = 'active'
                existing.save(update_fields=['status'])

            event_channel = f'channel_{channel_id}' if channel_id else f'dm_{dm_thread_id}'
            publish_event(event_channel, 'call.participant_joined', {
                'call_id': existing.id,
                'user': UserSerializer(request.user).data,
            })

            return Response(CallSessionSerializer(existing).data, status=status.HTTP_200_OK)

        # Create new call
        create_kwargs = {
            'initiator': request.user,
            'call_type': call_type,
        }
        if channel_id:
            create_kwargs['channel_id'] = channel_id
        else:
            create_kwargs['dm_thread_id'] = dm_thread_id

        call = CallSession.objects.create(**create_kwargs)
        CallParticipant.objects.create(
            call=call, user=request.user,
            is_video_off=call_type == 'voice',
        )

        event_channel = f'channel_{channel_id}' if channel_id else f'dm_{dm_thread_id}'
        publish_event(event_channel, 'call.started', {
            'call': CallSessionSerializer(call).data,
        })

        # Also send to user personal channels for ringing
        if dm_thread_id:
            from apps.dm.models import DMParticipant
            participants = DMParticipant.objects.filter(
                thread_id=dm_thread_id
            ).exclude(user=request.user).values_list('user_id', flat=True)
            for uid in participants:
                publish_event(f'user_{uid}', 'call.incoming', {
                    'call': CallSessionSerializer(call).data,
                })

        return Response(CallSessionSerializer(call).data, status=status.HTTP_201_CREATED)


class JoinCallView(APIView):
    """Join an existing call."""
    permission_classes = [IsAuthenticated]

    def post(self, request, call_id):
        try:
            call = CallSession.objects.get(id=call_id, status__in=['ringing', 'active'])
        except CallSession.DoesNotExist:
            return Response({'detail': 'Call not found or already ended.'}, status=status.HTTP_404_NOT_FOUND)

        participant, created = CallParticipant.objects.get_or_create(
            call=call, user=request.user,
            defaults={'is_muted': False, 'is_video_off': call.call_type == 'voice'},
        )

        if call.status == 'ringing':
            call.status = 'active'
            call.save(update_fields=['status'])

        channel_id = call.channel_id
        dm_thread_id = call.dm_thread_id
        event_channel = f'channel_{channel_id}' if channel_id else f'dm_{dm_thread_id}'

        publish_event(event_channel, 'call.participant_joined', {
            'call_id': call.id,
            'user': UserSerializer(request.user).data,
        })

        return Response(CallSessionSerializer(call).data)


class LeaveCallView(APIView):
    """Leave a call."""
    permission_classes = [IsAuthenticated]

    def post(self, request, call_id):
        try:
            call = CallSession.objects.get(id=call_id, status__in=['ringing', 'active'])
        except CallSession.DoesNotExist:
            return Response({'detail': 'Call not found or already ended.'}, status=status.HTTP_404_NOT_FOUND)

        CallParticipant.objects.filter(
            call=call, user=request.user, left_at__isnull=True
        ).update(left_at=timezone.now())

        channel_id = call.channel_id
        dm_thread_id = call.dm_thread_id
        event_channel = f'channel_{channel_id}' if channel_id else f'dm_{dm_thread_id}'

        publish_event(event_channel, 'call.participant_left', {
            'call_id': call.id,
            'user_id': request.user.id,
        })

        # If no active participants left, end the call
        active_count = CallParticipant.objects.filter(call=call, left_at__isnull=True).count()
        if active_count == 0:
            call.status = 'ended'
            call.ended_at = timezone.now()
            call.save(update_fields=['status', 'ended_at'])

            publish_event(event_channel, 'call.ended', {
                'call_id': call.id,
            })

        return Response({'detail': 'Left call.'})


class EndCallView(APIView):
    """End a call (initiator or any participant can end)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, call_id):
        try:
            call = CallSession.objects.get(id=call_id, status__in=['ringing', 'active'])
        except CallSession.DoesNotExist:
            return Response({'detail': 'Call not found or already ended.'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        call.status = 'ended'
        call.ended_at = now
        call.save(update_fields=['status', 'ended_at'])

        CallParticipant.objects.filter(call=call, left_at__isnull=True).update(left_at=now)

        channel_id = call.channel_id
        dm_thread_id = call.dm_thread_id
        event_channel = f'channel_{channel_id}' if channel_id else f'dm_{dm_thread_id}'

        publish_event(event_channel, 'call.ended', {
            'call_id': call.id,
        })

        return Response({'detail': 'Call ended.'})


class DeclineCallView(APIView):
    """Decline an incoming call."""
    permission_classes = [IsAuthenticated]

    def post(self, request, call_id):
        try:
            call = CallSession.objects.get(id=call_id, status='ringing')
        except CallSession.DoesNotExist:
            return Response({'detail': 'Call not found or not ringing.'}, status=status.HTTP_404_NOT_FOUND)

        channel_id = call.channel_id
        dm_thread_id = call.dm_thread_id

        # For DM calls, if all other participants decline, mark as declined
        if dm_thread_id:
            from apps.dm.models import DMParticipant
            other_users = DMParticipant.objects.filter(
                thread_id=dm_thread_id
            ).exclude(user=request.user).exclude(user=call.initiator).count()

            # Simple: just decline if it's a 1:1 call
            if other_users == 0:
                call.status = 'declined'
                call.ended_at = timezone.now()
                call.save(update_fields=['status', 'ended_at'])

                event_channel = f'dm_{dm_thread_id}'
                publish_event(event_channel, 'call.declined', {
                    'call_id': call.id,
                    'user_id': request.user.id,
                })

        return Response({'detail': 'Call declined.'})


class SignalingView(APIView):
    """WebRTC signaling relay via SSE.

    Clients POST their SDP offers/answers and ICE candidates here.
    The server relays them to other participants via SSE events.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, call_id):
        try:
            call = CallSession.objects.get(id=call_id, status__in=['ringing', 'active'])
        except CallSession.DoesNotExist:
            return Response({'detail': 'Call not found.'}, status=status.HTTP_404_NOT_FOUND)

        signal_type = request.data.get('type')  # 'offer', 'answer', 'ice-candidate'
        payload = request.data.get('payload')
        target_user_id = request.data.get('target_user_id')

        if not signal_type or not payload:
            return Response({'detail': 'type and payload required.'}, status=status.HTTP_400_BAD_REQUEST)

        if signal_type not in ('offer', 'answer', 'ice-candidate'):
            return Response({'detail': 'Invalid signal type.'}, status=status.HTTP_400_BAD_REQUEST)

        signal_data = {
            'call_id': call.id,
            'from_user_id': request.user.id,
            'type': signal_type,
            'payload': payload,
        }

        if target_user_id:
            # Send to specific user
            publish_event(f'user_{target_user_id}', 'call.signal', signal_data)
        else:
            # Broadcast to all participants
            active_participants = CallParticipant.objects.filter(
                call=call, left_at__isnull=True
            ).exclude(user=request.user).values_list('user_id', flat=True)
            for uid in active_participants:
                publish_event(f'user_{uid}', 'call.signal', signal_data)

        return Response({'detail': 'Signal sent.'})


class ToggleMediaView(APIView):
    """Toggle mute/video for a call participant."""
    permission_classes = [IsAuthenticated]

    def post(self, request, call_id):
        try:
            call = CallSession.objects.get(id=call_id, status='active')
        except CallSession.DoesNotExist:
            return Response({'detail': 'Call not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_muted = request.data.get('is_muted')
        is_video_off = request.data.get('is_video_off')

        participant = CallParticipant.objects.filter(
            call=call, user=request.user, left_at__isnull=True
        ).first()

        if not participant:
            return Response({'detail': 'Not in call.'}, status=status.HTTP_400_BAD_REQUEST)

        updates = {}
        if is_muted is not None:
            participant.is_muted = is_muted
            updates['is_muted'] = is_muted
        if is_video_off is not None:
            participant.is_video_off = is_video_off
            updates['is_video_off'] = is_video_off

        participant.save()

        channel_id = call.channel_id
        dm_thread_id = call.dm_thread_id
        event_channel = f'channel_{channel_id}' if channel_id else f'dm_{dm_thread_id}'

        publish_event(event_channel, 'call.media_toggle', {
            'call_id': call.id,
            'user_id': request.user.id,
            **updates,
        })

        return Response({'detail': 'Updated.'})


class ActiveCallView(APIView):
    """Get active call for a channel or DM thread."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        channel_id = request.query_params.get('channel_id')
        dm_thread_id = request.query_params.get('dm_thread_id')

        filters = {'status__in': ['ringing', 'active']}
        if channel_id:
            filters['channel_id'] = channel_id
        elif dm_thread_id:
            filters['dm_thread_id'] = dm_thread_id
        else:
            return Response({'detail': 'channel_id or dm_thread_id required.'}, status=status.HTTP_400_BAD_REQUEST)

        call = CallSession.objects.filter(**filters).first()
        if call:
            return Response(CallSessionSerializer(call).data)
        return Response(None, status=status.HTTP_204_NO_CONTENT)
