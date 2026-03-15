from django.contrib.auth.models import User
from django.db.models import Count
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.serializers import UserSerializer
from apps.notifications.models import AuditLog
from apps.notifications.serializers import AuditLogSerializer
from apps.workspaces.models import Workspace
from apps.messaging.models import Message


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_staff


class AdminUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = User.objects.all().select_related('profile')


class AdminUserUpdateView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = User.objects.all()


class AdminAuditLogView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = AuditLog.objects.all().select_related('user')
        workspace_id = self.request.query_params.get('workspace_id')
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)
        return qs


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        return Response({
            'total_users': User.objects.count(),
            'total_workspaces': Workspace.objects.count(),
            'total_messages': Message.objects.count(),
            'active_users_today': User.objects.filter(
                profile__status='online'
            ).count(),
        })
