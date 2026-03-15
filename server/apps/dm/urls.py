from django.urls import path
from . import views

urlpatterns = [
    path('threads/', views.DMThreadListView.as_view(), name='dm_threads'),
    path('threads/create/', views.DMThreadCreateView.as_view(), name='dm_thread_create'),
    path('threads/<int:thread_id>/messages/', views.DMMessageListView.as_view(), name='dm_messages'),
    path('threads/<int:thread_id>/messages/<int:pk>/', views.DMMessageDetailView.as_view(), name='dm_message_detail'),
]
