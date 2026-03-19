from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from apps.files.serializers import AttachmentSerializer
from .models import Message, MessageReaction, PinnedMessage


class ReactionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = MessageReaction
        fields = ['id', 'emoji', 'user', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class ReactionCountSerializer(serializers.Serializer):
    emoji = serializers.CharField()
    count = serializers.IntegerField()
    reacted = serializers.BooleanField()


class MessageSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    reactions = serializers.SerializerMethodField()
    reply_to_preview = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'channel', 'dm_thread', 'user', 'content', 'reply_to',
            'is_edited', 'is_deleted', 'created_at', 'updated_at',
            'reactions', 'reply_to_preview', 'attachments',
        ]
        read_only_fields = ['id', 'user', 'is_edited', 'is_deleted', 'created_at', 'updated_at']

    def get_reactions(self, obj):
        request = self.context.get('request')
        result = {}
        for reaction in obj.reactions.all():
            if reaction.emoji not in result:
                result[reaction.emoji] = {'emoji': reaction.emoji, 'count': 0, 'reacted': False}
            result[reaction.emoji]['count'] += 1
            if request and reaction.user_id == request.user.id:
                result[reaction.emoji]['reacted'] = True
        return list(result.values())

    def get_reply_to_preview(self, obj):
        if obj.reply_to and not obj.reply_to.is_deleted:
            return {
                'id': obj.reply_to.id,
                'content': obj.reply_to.content[:100],
                'user': UserSerializer(obj.reply_to.user).data,
            }
        return None


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['content', 'reply_to']


class PinnedMessageSerializer(serializers.ModelSerializer):
    message = MessageSerializer(read_only=True)

    class Meta:
        model = PinnedMessage
        fields = ['id', 'message', 'pinned_by', 'created_at']
        read_only_fields = ['id', 'pinned_by', 'created_at']
