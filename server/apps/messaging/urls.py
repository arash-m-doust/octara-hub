from django.urls import path
from . import views

urlpatterns = [
    path('<int:channel_id>/messages/', views.ChannelMessageListView.as_view(), name='channel_messages'),
    path('<int:channel_id>/messages/<int:pk>/', views.MessageDetailView.as_view(), name='message_detail'),
    path('<int:channel_id>/messages/<int:message_id>/reactions/', views.ReactionView.as_view(), name='message_reactions'),
    path('<int:channel_id>/messages/<int:message_id>/pin/', views.PinView.as_view(), name='message_pin'),
    path('<int:channel_id>/pins/', views.PinnedMessageListView.as_view(), name='pinned_messages'),
    path('<int:channel_id>/typing/', views.TypingView.as_view(), name='typing'),
]
