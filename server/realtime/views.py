import json
import time
from django.http import StreamingHttpResponse, JsonResponse
from django.views import View
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth.models import User

from apps.workspaces.models import WorkspaceMember, ChannelMember
from apps.dm.models import DMParticipant
from .sse import subscribe, unsubscribe


def authenticate_from_token(request):
    """Authenticate user from query param JWT token (EventSource can't send headers)."""
    token = request.GET.get('token')
    if not token:
        return None
    try:
        validated = AccessToken(token)
        return User.objects.get(id=validated['user_id'])
    except (TokenError, User.DoesNotExist):
        return None


class SSEEventStreamView(View):
    """SSE endpoint using plain Django View to avoid DRF content negotiation (406)."""

    def get(self, request):
        user = authenticate_from_token(request)
        if not user:
            return JsonResponse({'detail': 'Authentication required.'}, status=401)

        # Determine channels to subscribe to
        channels = []

        # Subscribe to all workspace channels the user is in
        channel_ids = ChannelMember.objects.filter(
            user=user
        ).values_list('channel_id', flat=True)
        for cid in channel_ids:
            channels.append(f'channel_{cid}')

        # Subscribe to all DM threads
        dm_ids = DMParticipant.objects.filter(
            user=user
        ).values_list('thread_id', flat=True)
        for tid in dm_ids:
            channels.append(f'dm_{tid}')

        # Personal notification channel
        channels.append(f'user_{user.id}')

        # Subscribe to all channels
        queues = {}
        for ch in channels:
            queues[ch] = subscribe(ch)

        def event_stream():
            try:
                # Send initial connection event
                yield f"data: {json.dumps({'type': 'connected', 'channels': channels})}\n\n"

                while True:
                    # Check all queues for events
                    found = False
                    for ch, q in queues.items():
                        try:
                            event = q.get_nowait()
                            yield f"data: {json.dumps(event)}\n\n"
                            found = True
                        except Exception:
                            pass

                    if not found:
                        # Send heartbeat every 15 seconds
                        yield f": heartbeat {int(time.time())}\n\n"
                        time.sleep(3)
            finally:
                for ch, q in queues.items():
                    unsubscribe(ch, q)

        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream',
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
