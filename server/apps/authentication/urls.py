from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('users/', views.UserDirectoryView.as_view(), name='users_directory'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('status/', views.StatusView.as_view(), name='status'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset_password'),
]
