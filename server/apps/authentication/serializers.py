from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['display_name', 'avatar_path', 'status', 'locale', 'theme', 'last_seen_at']
        read_only_fields = ['last_seen_at']


class PlatformUserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['display_name', 'avatar_path', 'status']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'profile']
        read_only_fields = ['id', 'is_staff', 'is_superuser']


class PlatformUserSerializer(serializers.ModelSerializer):
    profile = PlatformUserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'profile']
        read_only_fields = ['id', 'username', 'profile']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    display_name = serializers.CharField(max_length=100, required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'display_name']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        display_name = validated_data.pop('display_name', '')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        # Profile may already exist via post_save signal
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if display_name:
            profile.display_name = display_name
            profile.save(update_fields=['display_name'])
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='profile.display_name', required=False, allow_blank=True)
    locale = serializers.CharField(source='profile.locale', required=False, allow_blank=True)
    theme = serializers.CharField(source='profile.theme', required=False, allow_blank=True)
    status = serializers.ChoiceField(
        source='profile.status',
        choices=['online', 'idle', 'dnd', 'offline'],
        required=False,
    )

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'display_name', 'locale', 'theme', 'status']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        profile = instance.profile
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(validators=[validate_password])
    password_confirm = serializers.CharField()

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs
