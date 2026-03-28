"""Workspace integration tests for RBAC and membership flows."""

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Channel, ChannelMember, Role, Workspace, WorkspaceMember
from .services import ensure_workspace_core_roles, ensure_workspace_defaults


class WorkspaceDirectoryInviteRegressionTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            password='Password123!@#',
        )
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='Password123!@#',
            is_staff=True,
        )
        self.member = User.objects.create_user(
            username='member',
            email='member@example.com',
            password='Password123!@#',
        )
        self.outsider = User.objects.create_user(
            username='outsider',
            email='outsider@example.com',
            password='Password123!@#',
        )

        self.owner.profile.display_name = 'Owner User'
        self.owner.profile.save(update_fields=['display_name'])
        self.outsider.profile.display_name = 'Test User'
        self.outsider.profile.save(update_fields=['display_name'])

        self.workspace = Workspace.objects.create(
            name='Team',
            description='',
            owner=self.owner,
        )
        ensure_workspace_defaults(self.workspace, self.owner)
        default_role, admin_role = ensure_workspace_core_roles(self.workspace)
        WorkspaceMember.objects.update_or_create(
            workspace=self.workspace,
            user=self.admin,
            defaults={'role': admin_role},
        )
        WorkspaceMember.objects.update_or_create(
            workspace=self.workspace,
            user=self.member,
            defaults={'role': default_role},
        )

        self.public_channel = Channel.objects.create(
            workspace=self.workspace,
            name='public-room',
            is_private=False,
            is_archived=False,
        )
        self.private_channel = Channel.objects.create(
            workspace=self.workspace,
            name='secret',
            is_private=True,
            is_archived=False,
        )
        self.archived_public_channel = Channel.objects.create(
            workspace=self.workspace,
            name='old-public',
            is_private=False,
            is_archived=True,
        )

    def _extract_results(self, response):
        data = response.data
        return data['results'] if isinstance(data, dict) and 'results' in data else data

    def test_users_directory_lists_members_and_non_members(self):
        self.client.force_authenticate(user=self.owner)
        url = reverse('workspace_users', kwargs={'workspace_id': self.workspace.id})

        response = self.client.get(url, {'q': 'user'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self._extract_results(response)
        usernames = [item['username'] for item in results]
        self.assertIn('owner', usernames)
        self.assertIn('outsider', usernames)

        owner_row = next(item for item in results if item['username'] == 'owner')
        outsider_row = next(item for item in results if item['username'] == 'outsider')
        self.assertTrue(owner_row['is_member'])
        self.assertFalse(outsider_row['is_member'])
        self.assertEqual(outsider_row['profile']['display_name'], 'Test User')
        self.assertNotIn('email', outsider_row)

    def test_invite_by_admin_creates_membership_and_public_channel_access(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('workspace_member_invite', kwargs={'workspace_id': self.workspace.id})

        response = self.client.post(url, {'user_id': self.outsider.id}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            WorkspaceMember.objects.filter(
                workspace=self.workspace,
                user=self.outsider,
            ).exists()
        )
        self.assertTrue(
            ChannelMember.objects.filter(channel=self.public_channel, user=self.outsider).exists()
        )
        self.assertFalse(
            ChannelMember.objects.filter(channel=self.private_channel, user=self.outsider).exists()
        )
        self.assertFalse(
            ChannelMember.objects.filter(channel=self.archived_public_channel, user=self.outsider).exists()
        )

    def test_invite_by_regular_member_is_forbidden(self):
        self.client.force_authenticate(user=self.member)
        url = reverse('workspace_member_invite', kwargs={'workspace_id': self.workspace.id})

        response = self.client.post(url, {'user_id': self.outsider.id}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invite_existing_member_returns_bad_request(self):
        self.client.force_authenticate(user=self.owner)
        url = reverse('workspace_member_invite', kwargs={'workspace_id': self.workspace.id})

        response = self.client.post(url, {'user_id': self.member.id}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class WorkspaceFinalRBACTests(APITestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            username='root',
            email='root@example.com',
            password='Password123!@#',
        )
        self.staff_user = User.objects.create_user(
            username='admin-user',
            email='admin@example.com',
            password='Password123!@#',
            is_staff=True,
        )
        self.normal_user = User.objects.create_user(
            username='normal-user',
            email='normal@example.com',
            password='Password123!@#',
        )
        self.member_user = User.objects.create_user(
            username='member-user',
            email='member@example.com',
            password='Password123!@#',
        )

    def _extract_results(self, response):
        data = response.data
        return data['results'] if isinstance(data, dict) and 'results' in data else data

    def test_workspace_create_only_staff_or_superuser(self):
        url = reverse('workspace_list_create')

        self.client.force_authenticate(user=self.normal_user)
        forbidden = self.client.post(url, {'name': 'No Access'}, format='json')
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.staff_user)
        created_by_staff = self.client.post(url, {'name': 'Staff Space'}, format='json')
        self.assertEqual(created_by_staff.status_code, status.HTTP_201_CREATED)
        staff_workspace = Workspace.objects.get(id=created_by_staff.data['id'])
        self.assertEqual(staff_workspace.owner_id, self.staff_user.id)
        self.assertEqual(staff_workspace.categories.filter(name='General').count(), 1)
        self.assertEqual(
            staff_workspace.channels.filter(name='general', is_archived=False).count(),
            1,
        )
        self.assertTrue(
            Role.objects.filter(workspace=staff_workspace, name='Member').exists()
        )
        self.assertTrue(
            Role.objects.filter(workspace=staff_workspace, name='Admin').exists()
        )

        self.client.force_authenticate(user=self.superuser)
        created_by_super = self.client.post(url, {'name': 'Root Space'}, format='json')
        self.assertEqual(created_by_super.status_code, status.HTTP_201_CREATED)

    def test_superuser_sees_all_workspaces_non_superuser_sees_member_scope(self):
        ws_staff = Workspace.objects.create(name='Staff Workspace', owner=self.staff_user)
        ws_normal = Workspace.objects.create(name='Normal Workspace', owner=self.normal_user)
        ensure_workspace_defaults(ws_staff, self.staff_user)
        ensure_workspace_defaults(ws_normal, self.normal_user)

        default_role_staff, _ = ensure_workspace_core_roles(ws_staff)
        WorkspaceMember.objects.update_or_create(
            workspace=ws_staff,
            user=self.member_user,
            defaults={'role': default_role_staff},
        )

        list_url = reverse('workspace_list_create')

        self.client.force_authenticate(user=self.superuser)
        super_res = self.client.get(list_url)
        super_ids = {item['id'] for item in self._extract_results(super_res)}
        self.assertEqual(super_res.status_code, status.HTTP_200_OK)
        self.assertIn(ws_staff.id, super_ids)
        self.assertIn(ws_normal.id, super_ids)

        self.client.force_authenticate(user=self.member_user)
        member_res = self.client.get(list_url)
        member_ids = {item['id'] for item in self._extract_results(member_res)}
        self.assertEqual(member_res.status_code, status.HTTP_200_OK)
        self.assertEqual(member_ids, {ws_staff.id})

    def test_default_general_creation_is_idempotent(self):
        workspace = Workspace.objects.create(name='No Dupes', owner=self.staff_user)
        ensure_workspace_defaults(workspace, self.staff_user)
        ensure_workspace_defaults(workspace, self.staff_user)

        self.assertEqual(workspace.categories.filter(name='General').count(), 1)
        self.assertEqual(
            workspace.channels.filter(name='general', is_archived=False).count(),
            1,
        )

    def test_channel_list_has_no_duplicates(self):
        workspace = Workspace.objects.create(name='Channels', owner=self.staff_user)
        ensure_workspace_defaults(workspace, self.staff_user)
        default_role, _ = ensure_workspace_core_roles(workspace)
        WorkspaceMember.objects.update_or_create(
            workspace=workspace,
            user=self.member_user,
            defaults={'role': default_role},
        )

        private = Channel.objects.create(
            workspace=workspace,
            name='private-room',
            is_private=True,
            is_archived=False,
        )
        ChannelMember.objects.get_or_create(channel=private, user=self.member_user)

        list_url = reverse('channel_list_create', kwargs={'workspace_id': workspace.id})
        self.client.force_authenticate(user=self.member_user)
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payload = self._extract_results(response)
        ids = [row['id'] for row in payload]
        self.assertEqual(len(ids), len(set(ids)))

    def test_admin_and_superuser_can_kick_member_but_not_owner(self):
        workspace = Workspace.objects.create(name='Kick Test', owner=self.staff_user)
        ensure_workspace_defaults(workspace, self.staff_user)
        default_role, admin_role = ensure_workspace_core_roles(workspace)

        admin_member = User.objects.create_user(
            username='workspace-admin',
            email='workspace-admin@example.com',
            password='Password123!@#',
            is_staff=True,
        )
        target_member = User.objects.create_user(
            username='kick-target',
            email='kick-target@example.com',
            password='Password123!@#',
        )

        WorkspaceMember.objects.update_or_create(
            workspace=workspace,
            user=admin_member,
            defaults={'role': admin_role},
        )
        WorkspaceMember.objects.update_or_create(
            workspace=workspace,
            user=target_member,
            defaults={'role': default_role},
        )

        kick_url = reverse(
            'workspace_member_kick',
            kwargs={'workspace_id': workspace.id, 'user_id': target_member.id},
        )
        owner_kick_url = reverse(
            'workspace_member_kick',
            kwargs={'workspace_id': workspace.id, 'user_id': self.staff_user.id},
        )

        self.client.force_authenticate(user=admin_member)
        admin_kick = self.client.delete(kick_url)
        self.assertEqual(admin_kick.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            WorkspaceMember.objects.filter(workspace=workspace, user=target_member).exists()
        )

        WorkspaceMember.objects.update_or_create(
            workspace=workspace,
            user=target_member,
            defaults={'role': default_role},
        )
        self.client.force_authenticate(user=self.superuser)
        super_kick = self.client.delete(kick_url)
        self.assertEqual(super_kick.status_code, status.HTTP_204_NO_CONTENT)

        self.client.force_authenticate(user=admin_member)
        owner_kick = self.client.delete(owner_kick_url)
        self.assertEqual(owner_kick.status_code, status.HTTP_400_BAD_REQUEST)

    def test_regular_member_cannot_kick_member(self):
        workspace = Workspace.objects.create(name='Kick Scope', owner=self.staff_user)
        ensure_workspace_defaults(workspace, self.staff_user)
        default_role, _ = ensure_workspace_core_roles(workspace)

        WorkspaceMember.objects.update_or_create(
            workspace=workspace,
            user=self.member_user,
            defaults={'role': default_role},
        )
        WorkspaceMember.objects.update_or_create(
            workspace=workspace,
            user=self.normal_user,
            defaults={'role': default_role},
        )

        kick_url = reverse(
            'workspace_member_kick',
            kwargs={'workspace_id': workspace.id, 'user_id': self.normal_user.id},
        )
        self.client.force_authenticate(user=self.member_user)
        response = self.client.delete(kick_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_category_and_channel_create_require_admin_or_owner_scope(self):
        workspace = Workspace.objects.create(name='Manage Scope', owner=self.normal_user)
        ensure_workspace_defaults(workspace, self.normal_user)
        default_role, _ = ensure_workspace_core_roles(workspace)

        WorkspaceMember.objects.update_or_create(
            workspace=workspace,
            user=self.staff_user,
            defaults={'role': default_role},
        )
        WorkspaceMember.objects.update_or_create(
            workspace=workspace,
            user=self.member_user,
            defaults={'role': default_role},
        )

        category_url = reverse('category_list_create', kwargs={'workspace_id': workspace.id})
        channel_url = reverse('channel_list_create', kwargs={'workspace_id': workspace.id})

        self.client.force_authenticate(user=self.member_user)
        member_category = self.client.post(category_url, {'name': 'member-cat'}, format='json')
        member_channel = self.client.post(channel_url, {'name': 'member-chan'}, format='json')
        self.assertEqual(member_category.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(member_channel.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.staff_user)
        staff_category = self.client.post(category_url, {'name': 'staff-cat'}, format='json')
        self.assertEqual(staff_category.status_code, status.HTTP_201_CREATED)
        staff_channel = self.client.post(
            channel_url,
            {'name': 'staff-chan', 'category': staff_category.data['id']},
            format='json',
        )
        self.assertEqual(staff_channel.status_code, status.HTTP_201_CREATED)

    def test_promote_demote_is_superuser_only_and_owner_protected(self):
        workspace = Workspace.objects.create(name='Role Control', owner=self.staff_user)
        ensure_workspace_defaults(workspace, self.staff_user)
        member_role, admin_role = ensure_workspace_core_roles(workspace)

        target_user = User.objects.create_user(
            username='role-target',
            email='role-target@example.com',
            password='Password123!@#',
        )
        outsider_workspace = Workspace.objects.create(name='Other', owner=self.normal_user)
        ensure_workspace_defaults(outsider_workspace, self.normal_user)
        outsider_member_role, _ = ensure_workspace_core_roles(outsider_workspace)

        WorkspaceMember.objects.update_or_create(
            workspace=workspace,
            user=target_user,
            defaults={'role': member_role},
        )
        WorkspaceMember.objects.update_or_create(
            workspace=workspace,
            user=self.member_user,
            defaults={'role': member_role},
        )
        WorkspaceMember.objects.update_or_create(
            workspace=outsider_workspace,
            user=self.member_user,
            defaults={'role': outsider_member_role},
        )

        role_url = reverse(
            'workspace_member_role_update',
            kwargs={'workspace_id': workspace.id, 'user_id': target_user.id},
        )

        self.client.force_authenticate(user=self.member_user)
        member_forbidden = self.client.patch(
            role_url,
            {'role_id': admin_role.id},
            format='json',
        )
        self.assertEqual(member_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.staff_user)
        staff_forbidden = self.client.patch(
            role_url,
            {'role_id': admin_role.id},
            format='json',
        )
        self.assertEqual(staff_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.superuser)
        promote = self.client.patch(role_url, {'role_id': admin_role.id}, format='json')
        self.assertEqual(promote.status_code, status.HTTP_200_OK)
        self.assertEqual(
            WorkspaceMember.objects.get(workspace=workspace, user=target_user).role_id,
            admin_role.id,
        )

        demote = self.client.patch(role_url, {'role_id': member_role.id}, format='json')
        self.assertEqual(demote.status_code, status.HTTP_200_OK)
        self.assertEqual(
            WorkspaceMember.objects.get(workspace=workspace, user=target_user).role_id,
            member_role.id,
        )

        owner_role_url = reverse(
            'workspace_member_role_update',
            kwargs={'workspace_id': workspace.id, 'user_id': workspace.owner_id},
        )
        owner_change = self.client.patch(
            owner_role_url,
            {'role_id': admin_role.id},
            format='json',
        )
        self.assertEqual(owner_change.status_code, status.HTTP_400_BAD_REQUEST)

        invalid_role = self.client.patch(
            role_url,
            {'role_id': outsider_member_role.id},
            format='json',
        )
        self.assertEqual(invalid_role.status_code, status.HTTP_400_BAD_REQUEST)
