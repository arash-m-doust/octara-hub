"""DM realtime contract tests."""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DMThread, DMParticipant
from apps.notifications.models import Notification


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
        self.assertEqual(Notification.objects.count(), 0)

    def test_dm_typing_publishes_thread_typing_event(self):
        self.client.force_authenticate(user=self.sender)
        url = reverse('dm_typing', kwargs={'thread_id': self.thread.id})

        with patch('apps.dm.views.publish_event') as mocked_publish:
            response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(
            any(
                c.args[0] == f'dm_{self.thread.id}' and c.args[1] == 'dm.typing.start'
                for c in mocked_publish.call_args_list
            )
        )

    def test_dm_read_updates_last_read_message_id(self):
        self.client.force_authenticate(user=self.sender)
        send_url = reverse('dm_messages', kwargs={'thread_id': self.thread.id})
        read_url = reverse('dm_read', kwargs={'thread_id': self.thread.id})

        send_response = self.client.post(send_url, {'content': 'mark as read test'}, format='json')
        self.assertEqual(send_response.status_code, status.HTTP_201_CREATED)

        read_response = self.client.post(read_url, format='json')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(read_response.data['thread_id'], self.thread.id)
        self.assertEqual(read_response.data['unread_count'], 0)
        self.assertIsNotNone(read_response.data['last_read_message_id'])

        participant = DMParticipant.objects.get(thread=self.thread, user=self.sender)
        self.assertEqual(participant.last_read_message_id, read_response.data['last_read_message_id'])

    def test_dm_read_rejects_non_participant(self):
        outsider = User.objects.create_user(
            username='outsider',
            email='outsider@example.com',
            password='Password123!@#',
        )
        self.client.force_authenticate(user=outsider)
        read_url = reverse('dm_read', kwargs={'thread_id': self.thread.id})

        response = self.client.post(read_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
