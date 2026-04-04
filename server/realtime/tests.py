import json
from unittest.mock import patch

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken
from apps.workspaces.models import Workspace
from apps.workspaces.services import ensure_workspace_defaults


class SSEEventStreamTests(APITestCase):
    def test_requires_token(self):
        url = reverse('sse_events')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_connected_event_and_heartbeat_frame(self):
        user = User.objects.create_user(
            username='sse-user',
            email='sse-user@example.com',
            password='Password123!@#',
        )
        workspace = Workspace.objects.create(name='SSE Workspace', owner=user)
        ensure_workspace_defaults(workspace, user)
        token = str(AccessToken.for_user(user))
        url = f"{reverse('sse_events')}?token={token}"

        with patch('realtime.views.HEARTBEAT_TIMEOUT_SECONDS', 0.01):
            response = self.client.get(url, stream=True)
            chunks = []
            for chunk in response.streaming_content:
                text = chunk.decode() if isinstance(chunk, bytes) else chunk
                chunks.append(text)
                if len(chunks) >= 2:
                    break

        self.assertEqual(response.status_code, 200)
        self.assertTrue(chunks[0].startswith('data: '))
        payload = json.loads(chunks[0][len('data: '):].strip())
        self.assertEqual(payload['type'], 'connected')
        self.assertIn(f'user_{user.id}', payload['channels'])
        self.assertIn(f'workspace_{workspace.id}', payload['channels'])
        self.assertTrue(chunks[1].startswith(': heartbeat'))
