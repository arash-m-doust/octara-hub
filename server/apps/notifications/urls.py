from django.urls import path
from . import views

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notifications'),
    path('<int:pk>/read/', views.NotificationReadView.as_view(), name='notification_read'),
    path('read-all/', views.NotificationReadAllView.as_view(), name='notification_read_all'),
]
