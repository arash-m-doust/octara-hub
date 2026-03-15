from django.urls import path
from . import views

urlpatterns = [
    path('messages/', views.MessageSearchView.as_view(), name='search_messages'),
    path('files/', views.FileSearchView.as_view(), name='search_files'),
]
