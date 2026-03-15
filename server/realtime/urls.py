from django.urls import path
from . import views

urlpatterns = [
    path('events/', views.SSEEventStreamView.as_view(), name='sse_events'),
]
