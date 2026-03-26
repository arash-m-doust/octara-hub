from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Workspace, WorkspaceMember, Role, Category, Channel, ChannelMember
from .serializers import (
    WorkspaceSerializer, WorkspaceCreateSerializer, WorkspaceMemberSerializer,
    RoleSerializer, CategorySerializer, ChannelSerializer, JoinWorkspaceSerializer,
)
from .permissions import IsWorkspaceMember, IsWorkspaceOwner, CanManageChannels, CanManageRoles, CanKickMembers


# ─── Workspaces ───

# class WorkspaceListCreateView(generics.ListCreateAPIView):
#     def get_serializer_class(self):
#         if self.request.method == 'POST':
#             return WorkspaceCreateSerializer
#         return WorkspaceSerializer

#     def get_queryset(self):
#         return Workspace.objects.filter(
#             members__user=self.request.user
#         ).distinct()


# Gemini Fixed
class WorkspaceListCreateView(generics.ListCreateAPIView):
    ordering = ('-created_at',) 

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return WorkspaceCreateSerializer
        return WorkspaceSerializer

    def get_queryset(self):
        return Workspace.objects.filter(
            members__user=self.request.user
        ).distinct()

class WorkspaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkspaceSerializer
    lookup_url_kwarg = 'workspace_id'

    def get_queryset(self):
        return Workspace.objects.filter(members__user=self.request.user)

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [permissions.IsAuthenticated(), IsWorkspaceOwner()]
        return [permissions.IsAuthenticated()]


class WorkspaceInviteView(APIView):
    def post(self, request, workspace_id):
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
            workspace = Workspace.objects.get(invite_code=serializer.validated_data['invite_code'])
        except Workspace.DoesNotExist:
            return Response({'detail': 'Invalid invite code.'}, status=404)

        _, created = WorkspaceMember.objects.get_or_create(
            workspace=workspace, user=request.user,
            defaults={'role': workspace.roles.filter(is_default=True).first()},
        )
        if not created:
            return Response({'detail': 'Already a member.'}, status=400)

        # Auto-add new member to all public channels in this workspace
        public_channels = Channel.objects.filter(workspace=workspace, is_private=False, is_archived=False)
        for channel in public_channels:
            ChannelMember.objects.get_or_create(channel=channel, user=request.user)

        return Response(WorkspaceSerializer(workspace, context={'request': request}).data, status=201)


# ─── Members ───

class WorkspaceMemberListView(generics.ListAPIView):
    serializer_class = WorkspaceMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        return WorkspaceMember.objects.filter(
            workspace_id=self.kwargs['workspace_id']
        ).select_related('user', 'user__profile', 'role')


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
            member = WorkspaceMember.objects.get(workspace_id=workspace_id, user_id=user_id)
        except WorkspaceMember.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=404)
        if member.workspace.owner_id == user_id:
            return Response({'detail': 'Cannot kick the owner.'}, status=400)
        member.delete()
        return Response(status=204)


# ─── Roles ───

class RoleListCreateView(generics.ListCreateAPIView):
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        return Role.objects.filter(workspace_id=self.kwargs['workspace_id'])

    def perform_create(self, serializer):
        serializer.save(workspace_id=self.kwargs['workspace_id'])


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageRoles]

    def get_queryset(self):
        return Role.objects.filter(workspace_id=self.kwargs['workspace_id'])


# ─── Categories ───

class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

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


# ─── Channels ───

class ChannelListCreateView(generics.ListCreateAPIView):
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        qs = Channel.objects.filter(
            workspace_id=self.kwargs['workspace_id'], is_archived=False
        )
        # Filter private channels to only those the user is a member of
        user = self.request.user
        return qs.exclude(
            is_private=True
        ) | qs.filter(
            is_private=True, members__user=user
        )

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
        members = ChannelMember.objects.filter(
            channel_id=channel_id
        ).select_related('user', 'user__profile')
        from apps.authentication.serializers import UserSerializer
        users = [m.user for m in members]
        return Response(UserSerializer(users, many=True).data)

    def post(self, request, workspace_id, channel_id):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id required.'}, status=400)
        if not WorkspaceMember.objects.filter(workspace_id=workspace_id, user_id=user_id).exists():
            return Response({'detail': 'User is not a workspace member.'}, status=400)
        _, created = ChannelMember.objects.get_or_create(channel_id=channel_id, user_id=user_id)
        if not created:
            return Response({'detail': 'Already a member.'}, status=400)
        return Response({'detail': 'Added.'}, status=201)
