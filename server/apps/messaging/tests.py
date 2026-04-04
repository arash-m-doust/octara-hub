from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.dm.models import DMThread, DMParticipant
from apps.messaging.models import Message, PinnedMessage
from apps.workspaces.models import Channel, ChannelMember, Workspace, WorkspaceMember
from apps.workspaces.services import ensure_workspace_defaults


class MessageDeletePermissionTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            password='Password123!@#',
        )
        self.admin_user = User.objects.create_user(
            username='workspace_admin',
            email='admin@example.com',
            password='Password123!@#',
        )
        self.member_user = User.objects.create_user(
            username='member',
            email='member@example.com',
            password='Password123!@#',
        )
        self.other_member = User.objects.create_user(
            username='other_member',
            email='other_member@example.com',
            password='Password123!@#',
        )

        self.workspace = Workspace.objects.create(name='Acme', owner=self.owner)
        ensure_workspace_defaults(self.workspace, self.owner)
        self.channel = Channel.objects.get(workspace=self.workspace, name='general')

        default_role = self.workspace.roles.filter(is_default=True).first()
        admin_role = self.workspace.roles.filter(name='Admin').first()

        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.admin_user,
            role=admin_role,
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member_user,
            role=default_role,
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.other_member,
            role=default_role,
        )
        ChannelMember.objects.get_or_create(channel=self.channel, user=self.admin_user)
        ChannelMember.objects.get_or_create(channel=self.channel, user=self.member_user)
        ChannelMember.objects.get_or_create(channel=self.channel, user=self.other_member)

        self.message = Message.objects.create(
            channel=self.channel,
            user=self.member_user,
            content='Message created by member',
        )

    def test_workspace_admin_can_delete_other_users_message(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('message_detail', kwargs={'channel_id': self.channel.id, 'pk': self.message.id})

        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.message.refresh_from_db()
        self.assertTrue(self.message.is_deleted)

    def test_regular_member_cannot_delete_other_users_message(self):
        self.client.force_authenticate(user=self.other_member)
        url = reverse('message_detail', kwargs={'channel_id': self.channel.id, 'pk': self.message.id})

        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.message.refresh_from_db()
        self.assertFalse(self.message.is_deleted)

    def test_channel_pin_rejects_message_outside_channel(self):
        dm_thread = DMThread.objects.create(is_group=False)
        DMParticipant.objects.create(thread=dm_thread, user=self.member_user)
        DMParticipant.objects.create(thread=dm_thread, user=self.other_member)
        dm_message = Message.objects.create(
            dm_thread=dm_thread,
            user=self.member_user,
            content='dm message should not pin into channel',
        )

        self.client.force_authenticate(user=self.member_user)
        pin_url = reverse('message_pin', kwargs={'channel_id': self.channel.id, 'message_id': dm_message.id})
        response = self.client.post(pin_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(PinnedMessage.objects.filter(channel=self.channel).exists())
