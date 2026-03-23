from django.urls import path
from . import views

urlpatterns = [
    path('start/', views.StartCallView.as_view(), name='start_call'),
    path('active/', views.ActiveCallView.as_view(), name='active_call'),
    path('<int:call_id>/join/', views.JoinCallView.as_view(), name='join_call'),
    path('<int:call_id>/leave/', views.LeaveCallView.as_view(), name='leave_call'),
    path('<int:call_id>/end/', views.EndCallView.as_view(), name='end_call'),
    path('<int:call_id>/decline/', views.DeclineCallView.as_view(), name='decline_call'),
    path('<int:call_id>/signal/', views.SignalingView.as_view(), name='call_signal'),
    path('<int:call_id>/media/', views.ToggleMediaView.as_view(), name='call_media'),
]
