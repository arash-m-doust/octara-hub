from rest_framework.permissions import BasePermission
from .models import WorkspaceMember


class IsWorkspaceMember(BasePermission):
    def has_permission(self, request, view):
        workspace_id = view.kwargs.get('workspace_id')
        if not workspace_id:
            return True
        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id, user=request.user
        ).exists()


class IsWorkspaceOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        workspace = obj if hasattr(obj, 'owner') else getattr(obj, 'workspace', None)
        if workspace:
            return workspace.owner_id == request.user.id
        return False


class HasWorkspacePermission(BasePermission):
    """Check if user has a specific permission in the workspace."""
    permission_name = None

    def has_permission(self, request, view):
        workspace_id = view.kwargs.get('workspace_id')
        if not workspace_id:
            return True
        try:
            member = WorkspaceMember.objects.select_related('role').get(
                workspace_id=workspace_id, user=request.user
            )
        except WorkspaceMember.DoesNotExist:
            return False
        # Workspace owner has all permissions
        if member.workspace.owner_id == request.user.id:
            return True
        if member.role and self.permission_name:
            return member.role.permissions.get(self.permission_name, False)
        return False


class CanManageChannels(HasWorkspacePermission):
    permission_name = 'manage_channels'


class CanManageRoles(HasWorkspacePermission):
    permission_name = 'manage_roles'


class CanManageMessages(HasWorkspacePermission):
    permission_name = 'manage_messages'


class CanKickMembers(HasWorkspacePermission):
    permission_name = 'kick_members'
