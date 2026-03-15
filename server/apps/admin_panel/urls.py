from django.urls import path
from . import views

urlpatterns = [
    path('users/', views.AdminUserListView.as_view(), name='admin_users'),
    path('users/<int:pk>/', views.AdminUserUpdateView.as_view(), name='admin_user_update'),
    path('audit-logs/', views.AdminAuditLogView.as_view(), name='admin_audit_logs'),
    path('stats/', views.AdminStatsView.as_view(), name='admin_stats'),
]
