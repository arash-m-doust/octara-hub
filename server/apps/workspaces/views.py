"""Workspace domain APIs.

Responsibilities:
- workspace list/create/detail with RBAC-aware scopes
- membership directory, invite, kick, and role update actions
- role/category/channel CRUD gates

Access model:
- SuperUser: global visibility + elevated control
- Staff/Admin: create workspace and manage inside member scope
- Normal user: membership-limited and no workspace creation
"""

from django.contrib.auth.models import User
from django.db.models import Case, CharField, Exists, F, OuterRef, Q, Value, When
from django.db.models.functions import Coalesce, Lower
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Channel, ChannelMember, Role, Workspace, WorkspaceMember
from .permissions import (
    CanCreateWorkspace,
    CanKickMembers,
    CanManageChannels,
    CanManageRoles,
    IsWorkspaceMember,
    IsWorkspaceOwner,
)
from .serializers import (
    CategorySerializer,
    ChannelSerializer,
    JoinWorkspaceSerializer,
    RoleSerializer,
    WorkspaceCreateSerializer,
    WorkspaceDirectoryUserSerializer,
    WorkspaceMemberSerializer,
    WorkspaceSerializer,
)
from .services import ensure_workspace_core_roles


# ---- Workspaces -------------------------------------------------------------

class WorkspaceListCreateView(generics.ListCreateAPIView):
    ordering = ('-created_at',)
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return WorkspaceCreateSerializer
        return WorkspaceSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            # Creation is intentionally restricted to staff/superuser.
            return [permissions.IsAuthenticated(), CanCreateWorkspace()]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        # Superuser sees all workspaces; others are membership scoped.
        if self.request.user.is_superuser:
            queryset = Workspace.objects.all().distinct()
        else:
            queryset = Workspace.objects.filter(
                members__user=self.request.user
            ).distinct()

        # Lazy backfill for older rows that may miss baseline roles.
        for workspace in queryset.iterator():
            ensure_workspace_core_roles(workspace)
        return queryset


class WorkspaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkspaceSerializer
    lookup_url_kwarg = 'workspace_id'

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Workspace.objects.all()
        return Workspace.objects.filter(members__user=self.request.user)

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [permissions.IsAuthenticated(), IsWorkspaceOwner()]
        return [permissions.IsAuthenticated()]


class WorkspaceInviteView(APIView):
    def post(self, request, workspace_id):
        # Owner refreshes invite in the normal path; superuser can also refresh.
        if request.user.is_superuser:
            try:
                workspace = Workspace.objects.get(id=workspace_id)
            except Workspace.DoesNotExist:
                return Response({'detail': 'Workspace not found.'}, status=404)
        else:
            try:
                workspace = Workspace.objects.get(id=workspace_id, owner=request.user)
            except Workspace.DoesNotExist:
                return Response({'detail': 'Not found or not owner.'}, status=404)
        import secrets
        workspace.invite_code = secrets.token_urlsafe(12)
        workspace.save(update_fields=['invite_code'])
        return Response({'invite_code': workspace.invite_code})


class JoinWorkspaceView(APIView):
    def post(self, request):
        serializer = JoinWorkspaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            workspace = Workspace.objects.get(
                invite_code=serializer.validated_data['invite_code']
            )
        except Workspace.DoesNotExist:
            return Response({'detail': 'Invalid invite code.'}, status=404)

        default_role, _ = ensure_workspace_core_roles(workspace)
        _, created = WorkspaceMember.objects.get_or_create(
            workspace=workspace,
            user=request.user,
            defaults={'role': default_role},
        )
        if not created:
            return Response({'detail': 'Already a member.'}, status=400)

        # New member is auto-joined to all active public channels.
        public_channels = Channel.objects.filter(
            workspace=workspace, is_private=False, is_archived=False
        )
        for channel in public_channels:
            ChannelMember.objects.get_or_create(channel=channel, user=request.user)

        return Response(
            WorkspaceSerializer(workspace, context={'request': request}).data,
            status=201,
        )


# ---- Members ----------------------------------------------------------------

class WorkspaceMemberListView(generics.ListAPIView):
    serializer_class = WorkspaceMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        workspace = Workspace.objects.filter(id=self.kwargs['workspace_id']).first()
        if workspace:
            ensure_workspace_core_roles(workspace)
        return WorkspaceMember.objects.filter(
            workspace_id=self.kwargs['workspace_id']
        ).select_related('user', 'user__profile', 'role')


class WorkspaceUserListView(generics.ListAPIView):
    serializer_class = WorkspaceDirectoryUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        workspace_id = self.kwargs['workspace_id']
        workspace = Workspace.objects.filter(id=workspace_id).first()
        if workspace:
            ensure_workspace_core_roles(workspace)

        membership_subquery = WorkspaceMember.objects.filter(
            workspace_id=workspace_id, user_id=OuterRef('pk')
        )

        queryset = User.objects.select_related('profile').annotate(
            is_member=Exists(membership_subquery),
            sort_name=Coalesce(
                Case(
                    When(profile__display_name='', then=Value(None)),
                    default=F('profile__display_name'),
                    output_field=CharField(),
                ),
                F('username'),
            ),
            sort_name_lower=Lower(
                Coalesce(
                    Case(
                        When(profile__display_name='', then=Value(None)),
                        default=F('profile__display_name'),
                        output_field=CharField(),
                    ),
                    F('username'),
                )
            ),
        )

        q = self.request.query_params.get('q', '').strip()
        if q:
            queryset = queryset.filter(
                Q(username__icontains=q) | Q(profile__display_name__icontains=q)
            )

        # Contract: members first, then lexical display name/username.
        return queryset.order_by('-is_member', 'sort_name_lower', Lower('username'))


class WorkspaceMemberUpdateView(generics.UpdateAPIView):
    serializer_class = WorkspaceMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]
    lookup_url_kwarg = 'user_id'
    lookup_field = 'user_id'

    def get_queryset(self):
        return WorkspaceMember.objects.filter(workspace_id=self.kwargs['workspace_id'])


class WorkspaceMemberKickView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanKickMembers]

    def delete(self, request, workspace_id, user_id):
        try:
            member = WorkspaceMember.objects.get(
                workspace_id=workspace_id, user_id=user_id
            )
        except WorkspaceMember.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=404)
        if member.workspace.owner_id == user_id:
            return Response({'detail': 'Cannot kick the owner.'}, status=400)
        member.delete()
        return Response(status=204)


class WorkspaceMemberInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanKickMembers]

    def post(self, request, workspace_id):
        user_id = request.data.get('user_id')
        if user_id is None:
            return Response({'detail': 'user_id required.'}, status=400)

        try:
            invited_user = User.objects.get(id=user_id)
        except (TypeError, ValueError, User.DoesNotExist):
            return Response({'detail': 'User not found.'}, status=404)

        try:
            workspace = Workspace.objects.get(id=workspace_id)
        except Workspace.DoesNotExist:
            return Response({'detail': 'Workspace not found.'}, status=404)

        if WorkspaceMember.objects.filter(
            workspace=workspace, user=invited_user
        ).exists():
            return Response({'detail': 'User is already a member.'}, status=400)

        default_role, _ = ensure_workspace_core_roles(workspace)
        member = WorkspaceMember.objects.create(
            workspace=workspace,
            user=invited_user,
            role=default_role,
        )

        public_channels = Channel.objects.filter(
            workspace=workspace,
            is_private=False,
            is_archived=False,
        )
        for channel in public_channels:
            ChannelMember.objects.get_or_create(channel=channel, user=invited_user)

        return Response(
            WorkspaceMemberSerializer(member, context={'request': request}).data,
            status=201,
        )


class WorkspaceMemberRoleUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, workspace_id, user_id):
        # Superuser-only in this phase by product decision.
        if not request.user.is_superuser:
            raise PermissionDenied('Only superuser can change workspace roles.')

        role_id = request.data.get('role_id')
        if role_id is None:
            return Response({'detail': 'role_id required.'}, status=400)

        try:
            member = WorkspaceMember.objects.select_related('workspace').get(
                workspace_id=workspace_id,
                user_id=user_id,
            )
        except WorkspaceMember.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=404)

        if member.workspace.owner_id == member.user_id:
            return Response({'detail': 'Cannot change owner role.'}, status=400)

        try:
            role = Role.objects.get(id=role_id, workspace_id=workspace_id)
        except Role.DoesNotExist:
            return Response({'detail': 'Role not found in this workspace.'}, status=400)

        if role.name not in ('Member', 'Admin'):
            return Response({'detail': 'Only Member/Admin roles are allowed.'}, status=400)

        member.role = role
        member.save(update_fields=['role'])

        return Response(
            WorkspaceMemberSerializer(member, context={'request': request}).data,
            status=200,
        )


# ---- Roles ------------------------------------------------------------------

class RoleListCreateView(generics.ListCreateAPIView):
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        workspace = Workspace.objects.filter(id=self.kwargs['workspace_id']).first()
        if workspace:
            ensure_workspace_core_roles(workspace)
        return Role.objects.filter(workspace_id=self.kwargs['workspace_id'])

    def perform_create(self, serializer):
        serializer.save(workspace_id=self.kwargs['workspace_id'])


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageRoles]

    def get_queryset(self):
        return Role.objects.filter(workspace_id=self.kwargs['workspace_id'])


# ---- Categories -------------------------------------------------------------

class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), CanManageChannels()]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        return Category.objects.filter(
            workspace_id=self.kwargs['workspace_id']
        ).prefetch_related('channels')

    def perform_create(self, serializer):
        serializer.save(workspace_id=self.kwargs['workspace_id'])


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, CanManageChannels]

    def get_queryset(self):
        return Category.objects.filter(workspace_id=self.kwargs['workspace_id'])


# ---- Channels ---------------------------------------------------------------

class ChannelListCreateView(generics.ListCreateAPIView):
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), CanManageChannels()]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        qs = Channel.objects.filter(
            workspace_id=self.kwargs['workspace_id'], is_archived=False
        )
        # Distinct guard prevents duplicate channel rows after relational joins.
        user = self.request.user
        return qs.filter(
            Q(is_private=False) | Q(is_private=True, members__user=user)
        ).distinct()

    def perform_create(self, serializer):
        channel = serializer.save(workspace_id=self.kwargs['workspace_id'])
        ChannelMember.objects.create(channel=channel, user=self.request.user)


class ChannelDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        return Channel.objects.filter(workspace_id=self.kwargs['workspace_id'])

    def perform_destroy(self, instance):
        instance.is_archived = True
        instance.save(update_fields=['is_archived'])


class ChannelMemberView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get(self, request, workspace_id, channel_id):
        members = ChannelMember.objects.filter(channel_id=channel_id).select_related(
            'user', 'user__profile'
        )
        from apps.authentication.serializers import UserSerializer

        users = [m.user for m in members]
        return Response(UserSerializer(users, many=True).data)

    def post(self, request, workspace_id, channel_id):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id required.'}, status=400)
        if not WorkspaceMember.objects.filter(
            workspace_id=workspace_id, user_id=user_id
        ).exists():
            return Response({'detail': 'User is not a workspace member.'}, status=400)
        _, created = ChannelMember.objects.get_or_create(
            channel_id=channel_id, user_id=user_id
        )
        if not created:
            return Response({'detail': 'Already a member.'}, status=400)
        return Response({'detail': 'Added.'}, status=201)
