"""Authentication and profile APIs.

This module provides:
- registration and JWT login
- authenticated user snapshot/profile updates
- lightweight global user directory for DM discovery
- password reset flow

Security note:
Forgot password intentionally returns a generic success response whether
the email exists or not, to avoid user enumeration.
"""

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    PlatformUserSerializer,
    ProfileUpdateSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]


class UserDirectoryView(generics.ListAPIView):
    serializer_class = PlatformUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Used by DM "All Users" selector. The current user is excluded.
        q = self.request.query_params.get('q', '').strip()
        queryset = User.objects.exclude(id=self.request.user.id).select_related('profile')
        if q:
            queryset = queryset.filter(
                Q(username__icontains=q) | Q(profile__display_name__icontains=q)
            )
        return queryset.order_by('username')


class MeView(APIView):
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        # Profile patch is intentionally centralized so frontend stores can
        # trust this endpoint as the canonical user snapshot.
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Update last_seen
        request.user.profile.last_seen_at = timezone.now()
        request.user.profile.save(update_fields=['last_seen_at'])
        return Response(UserSerializer(request.user).data)


class StatusView(APIView):
    def post(self, request):
        new_status = request.data.get('status')
        valid = ['online', 'idle', 'dnd', 'offline']
        if new_status not in valid:
            return Response({'detail': f'Invalid status. Choose from: {valid}'}, status=400)
        request.user.profile.status = new_status
        request.user.profile.save(update_fields=['status'])
        return Response(UserSerializer(request.user).data)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_mail(
                subject=f'{settings.APP_NAME} - Password Reset',
                message=f'Click to reset your password: {reset_url}',
                from_email=settings.EMAIL_HOST_USER or 'noreply@octara-hub.local',
                recipient_list=[email],
                fail_silently=True,
            )
        except User.DoesNotExist:
            # Keep the same response shape even for unknown emails.
            pass
        return Response({'detail': 'If the email exists, a reset link was sent.'})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            uid = force_str(urlsafe_base64_decode(request.data.get('uid', '')))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, User.DoesNotExist):
            return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, serializer.validated_data['token']):
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['password'])
        user.save()
        return Response({'detail': 'Password reset successfully.'})
