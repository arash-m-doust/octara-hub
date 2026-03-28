from __future__ import annotations

from typing import Tuple

from django.contrib.auth.models import User

from .models import Category, Channel, ChannelMember, Role, Workspace, WorkspaceMember


MEMBER_PERMISSIONS = {
    'send_messages': True,
    'read_messages': True,
    'upload_files': True,
}

ADMIN_PERMISSIONS = {
    'manage_channels': True,
    'manage_roles': True,
    'kick_members': True,
    'ban_members': True,
    'manage_messages': True,
    'send_messages': True,
    'read_messages': True,
    'upload_files': True,
    'manage_workspace': True,
}


def ensure_workspace_core_roles(workspace: Workspace) -> Tuple[Role, Role]:
    """Ensure Member(default) and Admin roles exist for a workspace."""
    default_role = workspace.roles.filter(is_default=True).first()
    if default_role is None:
        default_role, created = Role.objects.get_or_create(
            workspace=workspace,
            name='Member',
            defaults={
                'is_default': True,
                'permissions': MEMBER_PERMISSIONS.copy(),
            },
        )
        if not created and not default_role.is_default:
            default_role.is_default = True
            default_role.save(update_fields=['is_default'])

    admin_role, _ = Role.objects.get_or_create(
        workspace=workspace,
        name='Admin',
        defaults={
            'position': 1,
            'permissions': ADMIN_PERMISSIONS.copy(),
        },
    )

    current_permissions = admin_role.permissions or {}
    merged_permissions = {**current_permissions, **ADMIN_PERMISSIONS}
    if merged_permissions != current_permissions:
        admin_role.permissions = merged_permissions
        admin_role.save(update_fields=['permissions'])

    return default_role, admin_role


def ensure_workspace_defaults(workspace: Workspace, owner_user: User) -> None:
    """Ensure baseline roles, owner membership, and a single default general channel."""
    default_role, _ = ensure_workspace_core_roles(workspace)

    owner_membership, _ = WorkspaceMember.objects.get_or_create(
        workspace=workspace,
        user=owner_user,
        defaults={'role': default_role},
    )
    if owner_membership.role is None:
        owner_membership.role = default_role
        owner_membership.save(update_fields=['role'])

    # Idempotent "General" category creation for repeat-safe initialization.
    try:
        category, _ = Category.objects.get_or_create(
            workspace=workspace,
            name='General',
        )
    except Category.MultipleObjectsReturned:
        category = Category.objects.filter(
            workspace=workspace,
            name='General',
        ).order_by('id').first()
        if category is None:
            category = Category.objects.create(workspace=workspace, name='General')

    # Idempotent "general" channel creation; duplicate-safe for legacy data.
    try:
        general_channel, _ = Channel.objects.get_or_create(
            workspace=workspace,
            name='general',
            is_archived=False,
            defaults={
                'category': category,
                'description': 'General discussion',
            },
        )
    except Channel.MultipleObjectsReturned:
        general_channel = Channel.objects.filter(
            workspace=workspace,
            name='general',
            is_archived=False,
        ).order_by('id').first()
        if general_channel is None:
            general_channel = Channel.objects.create(
                workspace=workspace,
                category=category,
                name='general',
                description='General discussion',
                is_archived=False,
            )

    if general_channel and general_channel.category_id is None:
        general_channel.category = category
        general_channel.save(update_fields=['category'])

    if general_channel:
        ChannelMember.objects.get_or_create(channel=general_channel, user=owner_user)
