"""DM realtime contract tests."""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DMThread, DMParticipant
from apps.messaging.models import Message
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

    def test_participant_can_pin_and_unpin_dm_message(self):
        self.client.force_authenticate(user=self.sender)
        message_url = reverse('dm_messages', kwargs={'thread_id': self.thread.id})
        create_response = self.client.post(message_url, {'content': 'pin me'}, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        message_id = create_response.data['id']

        pin_url = reverse('dm_message_pin', kwargs={'thread_id': self.thread.id, 'message_id': message_id})
        list_url = reverse('dm_pins', kwargs={'thread_id': self.thread.id})

        pin_response = self.client.post(pin_url)
        self.assertEqual(pin_response.status_code, status.HTTP_201_CREATED)

        list_response = self.client.get(list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        results = list_response.data.get('results', list_response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['message']['id'], message_id)

        unpin_response = self.client.delete(pin_url)
        self.assertEqual(unpin_response.status_code, status.HTTP_204_NO_CONTENT)
        list_response_after = self.client.get(list_url)
        results_after = list_response_after.data.get('results', list_response_after.data)
        self.assertEqual(len(results_after), 0)

    def test_non_participant_cannot_pin_dm_message(self):
        message = Message.objects.create(
            dm_thread=self.thread,
            user=self.sender,
            content='no outsider pin',
        )
        outsider = User.objects.create_user(
            username='dm-outsider',
            email='dm-outsider@example.com',
            password='Password123!@#',
        )
        self.client.force_authenticate(user=outsider)
        pin_url = reverse('dm_message_pin', kwargs={'thread_id': self.thread.id, 'message_id': message.id})
        response = self.client.post(pin_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
