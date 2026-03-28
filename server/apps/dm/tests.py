"""DM realtime contract tests."""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DMThread, DMParticipant


class DMRealtimeEventTests(APITestCase):
    def setUp(self):
        self.sender = User.objects.create_user(
            username='sender',
            email='sender@example.com',
            password='Password123!@#',
        )
        self.recipient = User.objects.create_user(
            username='recipient',
            email='recipient@example.com',
            password='Password123!@#',
        )
        self.thread = DMThread.objects.create(is_group=False)
        DMParticipant.objects.create(thread=self.thread, user=self.sender)
        DMParticipant.objects.create(thread=self.thread, user=self.recipient)

    def test_dm_message_publishes_thread_and_user_events(self):
        self.client.force_authenticate(user=self.sender)
        url = reverse('dm_messages', kwargs={'thread_id': self.thread.id})

        with patch('apps.dm.views.publish_event') as mocked_publish:
            response = self.client.post(url, {'content': 'hello'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(
            any(
                c.args[0] == f'dm_{self.thread.id}' and c.args[1] == 'message.created'
                for c in mocked_publish.call_args_list
            )
        )
        self.assertTrue(
            any(
                c.args[0] == f'user_{self.recipient.id}' and c.args[1] == 'dm.message.created'
                for c in mocked_publish.call_args_list
            )
        )
        self.assertFalse(
            any(
                c.args[0] == f'user_{self.sender.id}' and c.args[1] == 'dm.message.created'
                for c in mocked_publish.call_args_list
            )
        )
