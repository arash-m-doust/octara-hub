from django.contrib.auth.models import User
from django.db.models import Count
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.serializers import UserSerializer
from apps.workspaces.models import Workspace, WorkspaceMember, Channel
from apps.messaging.models import Message


class IsSuperUser(permissions.BasePermission):
    """Only Django superusers can access admin panel."""
    def has_permission(self, request, view):
        return request.user.is_superuser


class AdminUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]
    queryset = User.objects.all().select_related('profile')


class AdminUserDetailView(APIView):
    """Toggle staff/admin status or delete a user (superuser only)."""
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        if user.is_superuser and user.id != request.user.id:
            return Response({'detail': 'Cannot modify another superuser.'}, status=403)

        # Toggle is_staff (admin) status
        if 'is_staff' in request.data:
            user.is_staff = request.data['is_staff']
        if 'is_active' in request.data:
            user.is_active = request.data['is_active']
        user.save()
        return Response(UserSerializer(user).data)

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        if user.is_superuser:
            return Response({'detail': 'Cannot delete a superuser.'}, status=403)
        if user.id == request.user.id:
            return Response({'detail': 'Cannot delete yourself.'}, status=403)

        user.delete()
        return Response({'detail': 'User deleted.'}, status=200)


class AdminWorkspaceListView(generics.ListAPIView):
    """List all workspaces (superuser only)."""
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]

    def get(self, request):
        workspaces = Workspace.objects.annotate(
            member_count_val=Count('members')
        ).values('id', 'name', 'owner__username', 'created_at', 'member_count_val')
        return Response(list(workspaces))


class AdminWorkspaceDeleteView(APIView):
    """Delete a workspace (superuser only)."""
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]

    def delete(self, request, pk):
        try:
            ws = Workspace.objects.get(pk=pk)
        except Workspace.DoesNotExist:
            return Response({'detail': 'Workspace not found.'}, status=404)
        ws.delete()
        return Response({'detail': 'Workspace deleted.'}, status=200)


class AdminMessageDeleteView(APIView):
    """Delete any message (superuser only)."""
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]

    def delete(self, request, pk):
        try:
            msg = Message.objects.get(pk=pk)
        except Message.DoesNotExist:
            return Response({'detail': 'Message not found.'}, status=404)
        msg.is_deleted = True
        msg.save(update_fields=['is_deleted'])
        return Response({'detail': 'Message deleted.'}, status=200)


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]

    def get(self, request):
        return Response({
            'total_users': User.objects.count(),
            'total_workspaces': Workspace.objects.count(),
            'total_messages': Message.objects.filter(is_deleted=False).count(),
            'total_channels': Channel.objects.filter(is_archived=False).count(),
        })
