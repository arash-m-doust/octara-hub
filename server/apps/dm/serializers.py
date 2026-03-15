from rest_framework import serializers
from django.contrib.auth.models import User
from apps.authentication.serializers import UserSerializer
from apps.messaging.serializers import MessageSerializer
from .models import DMThread, DMParticipant


class DMParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = DMParticipant
        fields = ['user', 'last_read_message_id', 'joined_at']


class DMThreadSerializer(serializers.ModelSerializer):
    participants = DMParticipantSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = DMThread
        fields = ['id', 'is_group', 'name', 'participants', 'last_message', 'unread_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if msg:
            return MessageSerializer(msg, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request:
            return 0
        participant = obj.participants.filter(user=request.user).first()
        if not participant or not participant.last_read_message_id:
            return obj.messages.count()
        return obj.messages.filter(id__gt=participant.last_read_message_id).count()


class DMThreadCreateSerializer(serializers.Serializer):
    user_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    name = serializers.CharField(max_length=100, required=False, default='')

    def validate_user_ids(self, value):
        existing = User.objects.filter(id__in=value).count()
        if existing != len(value):
            raise serializers.ValidationError('One or more users not found.')
        return value
