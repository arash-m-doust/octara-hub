from unittest.mock import patch
from pathlib import Path
from tempfile import TemporaryDirectory

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.dm.models import DMParticipant, DMThread
from apps.messaging.models import Message
from apps.workspaces.models import Channel, ChannelMember, Workspace, WorkspaceMember
from apps.workspaces.services import ensure_workspace_defaults
from apps.files.storage import generate_office_preview


class FileUploadRealtimeEventTests(APITestCase):
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
        self.outsider = User.objects.create_user(
            username='outsider',
            email='outsider@example.com',
            password='Password123!@#',
        )

        self.workspace = Workspace.objects.create(name='Acme', owner=self.sender)
        ensure_workspace_defaults(self.workspace, self.sender)
        self.channel = Channel.objects.get(workspace=self.workspace, name='general')
        default_role = self.workspace.roles.filter(is_default=True).first()
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.recipient,
            role=default_role,
        )
        ChannelMember.objects.get_or_create(channel=self.channel, user=self.recipient)

        self.thread = DMThread.objects.create(is_group=False)
        DMParticipant.objects.create(thread=self.thread, user=self.sender)
        DMParticipant.objects.create(thread=self.thread, user=self.recipient)

    def _file_payload(self, filename='hello.txt'):
        return {
            'file': SimpleUploadedFile(
                filename,
                b'hello world',
                content_type='text/plain',
            )
        }

    def test_channel_upload_publishes_message_created_and_updates_last_read(self):
        self.client.force_authenticate(user=self.sender)
        url = reverse('file_upload')

        with patch('apps.files.views.publish_event') as mocked_publish:
            response = self.client.post(
                url,
                {**self._file_payload(), 'channel_id': self.channel.id},
                format='multipart',
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        message_id = response.data['message']

        membership = ChannelMember.objects.get(channel=self.channel, user=self.sender)
        self.assertEqual(membership.last_read_message_id, message_id)

        channel_events = [
            c for c in mocked_publish.call_args_list
            if c.args[0] == f'channel_{self.channel.id}' and c.args[1] == 'message.created'
        ]
        self.assertTrue(channel_events)
        self.assertEqual(channel_events[0].args[2]['message']['id'], message_id)

    def test_dm_upload_publishes_dm_and_user_events_and_updates_read_state(self):
        self.client.force_authenticate(user=self.sender)
        url = reverse('file_upload')

        with patch('apps.files.views.publish_event') as mocked_publish:
            response = self.client.post(
                url,
                {**self._file_payload(), 'dm_thread_id': self.thread.id},
                format='multipart',
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        message_id = response.data['message']
        message = Message.objects.get(id=message_id)

        participant = DMParticipant.objects.get(thread=self.thread, user=self.sender)
        self.assertEqual(participant.last_read_message_id, message_id)

        self.thread.refresh_from_db()
        self.assertEqual(self.thread.updated_at, message.created_at)

        self.assertTrue(
            any(
                c.args[0] == f'dm_{self.thread.id}' and c.args[1] == 'message.created'
                for c in mocked_publish.call_args_list
            )
        )
        recipient_events = [
            c for c in mocked_publish.call_args_list
            if c.args[0] == f'user_{self.recipient.id}' and c.args[1] == 'dm.message.created'
        ]
        self.assertTrue(recipient_events)
        self.assertEqual(recipient_events[0].args[2]['thread_id'], self.thread.id)
        self.assertFalse(
            any(
                c.args[0] == f'user_{self.sender.id}' and c.args[1] == 'dm.message.created'
                for c in mocked_publish.call_args_list
            )
        )

    def test_dm_upload_rejects_non_participant(self):
        self.client.force_authenticate(user=self.outsider)
        url = reverse('file_upload')

        response = self.client.post(
            url,
            {**self._file_payload(), 'dm_thread_id': self.thread.id},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_office_upload_generates_preview_when_converter_succeeds(self):
        self.client.force_authenticate(user=self.sender)
        url = reverse('file_upload')
        preview_path = Path('D:/tmp/office_preview.pdf')

        with patch('apps.files.views.generate_office_preview', return_value=preview_path):
            response = self.client.post(
                url,
                {
                    'file': SimpleUploadedFile(
                        'report.xlsx',
                        b'office-binary',
                        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    ),
                    'channel_id': self.channel.id,
                },
                format='multipart',
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['preview_url'], f"/files/{response.data['id']}/preview/")

    def test_office_upload_falls_back_without_preview_when_converter_fails(self):
        self.client.force_authenticate(user=self.sender)
        url = reverse('file_upload')

        with patch('apps.files.views.generate_office_preview', return_value=None):
            response = self.client.post(
                url,
                {
                    'file': SimpleUploadedFile(
                        'report.docx',
                        b'office-binary',
                        content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    ),
                    'channel_id': self.channel.id,
                },
                format='multipart',
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['preview_url'])


class OfficePreviewConversionTests(APITestCase):
    def test_generate_office_preview_success(self):
        with TemporaryDirectory() as tmpdir:
            source = Path(tmpdir) / 'sheet.xlsx'
            source.write_bytes(b'fake')
            converted_pdf = Path(tmpdir) / 'sheet.pdf'

            def fake_run(*_args, **_kwargs):
                converted_pdf.write_bytes(b'%PDF-1.4 fake')
                return None

            with patch('apps.files.storage.subprocess.run', side_effect=fake_run):
                preview_path = generate_office_preview(source)

            self.assertIsNotNone(preview_path)
            self.assertTrue(preview_path.exists())
            self.assertTrue(str(preview_path).endswith('_preview.pdf'))

    def test_generate_office_preview_failure_returns_none(self):
        with TemporaryDirectory() as tmpdir:
            source = Path(tmpdir) / 'doc.docx'
            source.write_bytes(b'fake')

            with patch('apps.files.storage.subprocess.run', side_effect=FileNotFoundError):
                preview_path = generate_office_preview(source)

            self.assertIsNone(preview_path)

    def test_generate_office_preview_falls_back_to_html_for_xlsx(self):
        from openpyxl import Workbook

        with TemporaryDirectory() as tmpdir:
            source = Path(tmpdir) / 'sheet.xlsx'
            workbook = Workbook()
            sheet = workbook.active
            sheet['A1'] = 'Name'
            sheet['B1'] = 'Count'
            sheet['A2'] = 'Visitors'
            sheet['B2'] = 42
            workbook.save(source)
            workbook.close()

            with patch('apps.files.storage.subprocess.run', side_effect=FileNotFoundError):
                preview_path = generate_office_preview(source)

            self.assertIsNotNone(preview_path)
            assert preview_path is not None
            self.assertTrue(preview_path.exists())
            self.assertTrue(str(preview_path).endswith('_preview.html'))
