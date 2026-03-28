"""Workspace permission classes.

These classes implement RBAC behavior shared by workspace endpoints.
Superuser bypasses are intentionally explicit for clarity and auditability.
"""

from rest_framework.permissions import BasePermission
from .models import WorkspaceMember


class CanCreateWorkspace(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.is_staff)
        )


class IsWorkspaceMember(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        workspace_id = view.kwargs.get('workspace_id')
        if not workspace_id:
            return True
        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id, user=request.user
        ).exists()


class IsWorkspaceOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        workspace = obj if hasattr(obj, 'owner') else getattr(obj, 'workspace', None)
        if workspace:
            return workspace.owner_id == request.user.id
        return False


class HasWorkspacePermission(BasePermission):
    """Check if user has a specific permission in the workspace."""
    permission_name = None

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        workspace_id = view.kwargs.get('workspace_id')
        if not workspace_id:
            return True
        try:
            member = WorkspaceMember.objects.select_related('role').get(
                workspace_id=workspace_id, user=request.user
            )
        except WorkspaceMember.DoesNotExist:
            return False
        # Workspace owner has all permissions within that workspace.
        if member.workspace.owner_id == request.user.id:
            return True
        if member.role and self.permission_name:
            return member.role.permissions.get(self.permission_name, False)
        return False


class CanManageChannels(HasWorkspacePermission):
    permission_name = 'manage_channels'

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        workspace_id = view.kwargs.get('workspace_id')
        # Staff users are treated as global Admins, but still scoped to
        # workspaces where they are members (no unrestricted global access).
        if workspace_id and request.user.is_staff:
            return WorkspaceMember.objects.filter(
                workspace_id=workspace_id, user=request.user
            ).exists()
        return super().has_permission(request, view)


class CanManageRoles(HasWorkspacePermission):
    permission_name = 'manage_roles'


class CanManageMessages(HasWorkspacePermission):
    permission_name = 'manage_messages'


class CanKickMembers(HasWorkspacePermission):
    permission_name = 'kick_members'

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        workspace_id = view.kwargs.get('workspace_id')
        # Keep kick semantics aligned with channel-management semantics for staff.
        if workspace_id and request.user.is_staff:
            return WorkspaceMember.objects.filter(
                workspace_id=workspace_id, user=request.user
            ).exists()
        return super().has_permission(request, view)
