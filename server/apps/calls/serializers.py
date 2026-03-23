from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from .models import CallSession, CallParticipant


class CallParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = CallParticipant
        fields = ['id', 'user', 'joined_at', 'left_at', 'is_muted', 'is_video_off']
        read_only_fields = ['id', 'joined_at', 'left_at']


class CallSessionSerializer(serializers.ModelSerializer):
    initiator = UserSerializer(read_only=True)
    participants = CallParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = CallSession
        fields = [
            'id', 'channel', 'dm_thread', 'initiator', 'call_type',
            'status', 'started_at', 'ended_at', 'participants',
        ]
        read_only_fields = ['id', 'initiator', 'status', 'started_at', 'ended_at']
