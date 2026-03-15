from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.FileUploadView.as_view(), name='file_upload'),
    path('<int:pk>/', views.FileDownloadView.as_view(), name='file_download'),
    path('<int:pk>/preview/', views.FilePreviewView.as_view(), name='file_preview'),
    path('<int:pk>/delete/', views.FileDeleteView.as_view(), name='file_delete'),
    path('channel/<int:channel_id>/', views.ChannelFilesView.as_view(), name='channel_files'),
    path('dm/<int:thread_id>/', views.DMFilesView.as_view(), name='dm_files'),
]
