from django.urls import path
from . import views

urlpatterns = [
    path('users/', views.AdminUserListView.as_view(), name='admin_users'),
    path('users/<int:pk>/', views.AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('workspaces/', views.AdminWorkspaceListView.as_view(), name='admin_workspaces'),
    path('workspaces/<int:pk>/', views.AdminWorkspaceDeleteView.as_view(), name='admin_workspace_delete'),
    path('messages/<int:pk>/', views.AdminMessageDeleteView.as_view(), name='admin_message_delete'),
    path('stats/', views.AdminStatsView.as_view(), name='admin_stats'),
]
