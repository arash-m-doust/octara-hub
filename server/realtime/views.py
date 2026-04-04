import json
import queue as std_queue
import time
from django.http import StreamingHttpResponse, JsonResponse
from django.views import View
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth.models import User

from apps.workspaces.models import WorkspaceMember, ChannelMember
from apps.dm.models import DMParticipant
from .sse import subscribe_many, unsubscribe_many

HEARTBEAT_TIMEOUT_SECONDS = 15


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

        # Workspace-scoped updates (workspace/category/channel/member events)
        workspace_ids = WorkspaceMember.objects.filter(
            user=user
        ).values_list('workspace_id', flat=True)
        for wid in workspace_ids:
            channels.append(f'workspace_{wid}')

        # Subscribe to all DM threads
        dm_ids = DMParticipant.objects.filter(
            user=user
        ).values_list('thread_id', flat=True)
        for tid in dm_ids:
            channels.append(f'dm_{tid}')

        # Personal notification channel
        channels.append(f'user_{user.id}')

        # Subscribe with one queue to avoid channel-by-channel polling loops.
        channels = list(set(channels))
        event_queue = subscribe_many(channels)

        def event_stream():
            try:
                yield f"data: {json.dumps({'type': 'connected', 'channels': channels})}\n\n"

                while True:
                    try:
                        event = event_queue.get(timeout=HEARTBEAT_TIMEOUT_SECONDS)
                        yield f"data: {json.dumps(event)}\n\n"
                    except std_queue.Empty:
                        # Send heartbeat after silence timeout
                        yield f": heartbeat {int(time.time())}\n\n"
            finally:
                unsubscribe_many(channels, event_queue)

        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream',
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
