from django.urls import path
from . import views

urlpatterns = [
    # Workspaces
    path('', views.WorkspaceListCreateView.as_view(), name='workspace_list_create'),
    path('join/', views.JoinWorkspaceView.as_view(), name='workspace_join'),
    path('<int:workspace_id>/', views.WorkspaceDetailView.as_view(), name='workspace_detail'),
    path('<int:workspace_id>/invite/', views.WorkspaceInviteView.as_view(), name='workspace_invite'),

    # Members
    path('<int:workspace_id>/members/', views.WorkspaceMemberListView.as_view(), name='workspace_members'),
    path('<int:workspace_id>/users/', views.WorkspaceUserListView.as_view(), name='workspace_users'),
    path('<int:workspace_id>/members/invite/', views.WorkspaceMemberInviteView.as_view(), name='workspace_member_invite'),
    path('<int:workspace_id>/members/<int:user_id>/', views.WorkspaceMemberUpdateView.as_view(), name='workspace_member_update'),
    path('<int:workspace_id>/members/<int:user_id>/role/', views.WorkspaceMemberRoleUpdateView.as_view(), name='workspace_member_role_update'),
    path('<int:workspace_id>/members/<int:user_id>/kick/', views.WorkspaceMemberKickView.as_view(), name='workspace_member_kick'),

    # Roles
    path('<int:workspace_id>/roles/', views.RoleListCreateView.as_view(), name='role_list_create'),
    path('<int:workspace_id>/roles/<int:pk>/', views.RoleDetailView.as_view(), name='role_detail'),

    # Categories
    path('<int:workspace_id>/categories/', views.CategoryListCreateView.as_view(), name='category_list_create'),
    path('<int:workspace_id>/categories/<int:pk>/', views.CategoryDetailView.as_view(), name='category_detail'),

    # Channels
    path('<int:workspace_id>/channels/', views.ChannelListCreateView.as_view(), name='channel_list_create'),
    path('<int:workspace_id>/channels/<int:pk>/', views.ChannelDetailView.as_view(), name='channel_detail'),
    path('<int:workspace_id>/channels/<int:channel_id>/members/', views.ChannelMemberView.as_view(), name='channel_members'),
]
