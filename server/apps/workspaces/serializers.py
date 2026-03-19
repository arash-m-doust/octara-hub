from rest_framework import serializers
from django.contrib.auth.models import User
from apps.authentication.serializers import UserSerializer
from .models import Workspace, Role, WorkspaceMember, Category, Channel, ChannelMember


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'color', 'is_default', 'position', 'permissions', 'created_at']
        read_only_fields = ['id', 'created_at']


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    role = RoleSerializer(read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ['id', 'user', 'role', 'nickname', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class ChannelSerializer(serializers.ModelSerializer):
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = [
            'id', 'workspace', 'category', 'name', 'description', 'type',
            'is_private', 'is_archived', 'position', 'created_at', 'updated_at',
            'unread_count',
        ]
        read_only_fields = ['id', 'workspace', 'created_at', 'updated_at']

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request:
            return 0
        membership = ChannelMember.objects.filter(
            channel=obj, user=request.user
        ).first()
        if not membership or not membership.last_read_message_id:
            return obj.messages.count() if hasattr(obj, 'messages') else 0
        return obj.messages.filter(id__gt=membership.last_read_message_id).count() if hasattr(obj, 'messages') else 0


class CategorySerializer(serializers.ModelSerializer):
    channels = ChannelSerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'workspace', 'name', 'position', 'created_at', 'channels']
        read_only_fields = ['id', 'workspace', 'created_at']


class WorkspaceSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'name', 'description', 'icon_path', 'owner',
            'invite_code', 'created_at', 'updated_at',
            'member_count', 'is_owner',
        ]
        read_only_fields = ['id', 'owner', 'invite_code', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.members.count()

    def get_is_owner(self, obj):
        request = self.context.get('request')
        return request and obj.owner_id == request.user.id


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ['id', 'name', 'description']
        read_only_fields = ['id']

    def create(self, validated_data):
        user = self.context['request'].user
        workspace = Workspace.objects.create(owner=user, **validated_data)
        # Create default role
        default_role = Role.objects.create(
            workspace=workspace, name='Member', is_default=True,
            permissions={'send_messages': True, 'read_messages': True, 'upload_files': True},
        )
        # Create admin role
        Role.objects.create(
            workspace=workspace, name='Admin', position=1,
            permissions={
                'manage_channels': True, 'manage_roles': True, 'kick_members': True,
                'ban_members': True, 'manage_messages': True, 'send_messages': True,
                'read_messages': True, 'upload_files': True, 'manage_workspace': True,
            },
        )
        # Add owner as member
        WorkspaceMember.objects.create(workspace=workspace, user=user, role=default_role)
        # Create default category and channel
        category = Category.objects.create(workspace=workspace, name='General')
        Channel.objects.create(workspace=workspace, category=category, name='general', description='General discussion')
        return workspace


class JoinWorkspaceSerializer(serializers.Serializer):
    invite_code = serializers.CharField(max_length=20)
