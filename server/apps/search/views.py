from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from apps.messaging.models import Message
from apps.messaging.serializers import MessageSerializer
from apps.files.models import Attachment
from apps.files.serializers import AttachmentSerializer
from apps.workspaces.models import WorkspaceMember
from apps.dm.models import DMParticipant


class SearchPagination(PageNumberPagination):
    page_size = 20


class MessageSearchView(APIView):
    def get(self, request):
        q = request.query_params.get('q', '').strip()
        channel_id = request.query_params.get('channel_id')
        workspace_id = request.query_params.get('workspace_id')
        user_id = request.query_params.get('user_id')
        dm_thread_id = request.query_params.get('dm_thread_id')

        if not q:
            return Response({'detail': 'Query parameter "q" is required.'}, status=400)

        qs = Message.objects.filter(is_deleted=False)

        # Apply search
        qs = qs.filter(content__icontains=q)

        # Scope to user's accessible content
        if dm_thread_id:
            if not DMParticipant.objects.filter(thread_id=dm_thread_id, user=request.user).exists():
                return Response({'results': []})
            qs = qs.filter(dm_thread_id=dm_thread_id)
        elif workspace_id:
            if not WorkspaceMember.objects.filter(workspace_id=workspace_id, user=request.user).exists():
                return Response({'results': []})
            qs = qs.filter(channel__workspace_id=workspace_id)
        else:
            # Search across all user's workspaces and DMs
            workspace_ids = WorkspaceMember.objects.filter(
                user=request.user
            ).values_list('workspace_id', flat=True)
            dm_ids = DMParticipant.objects.filter(
                user=request.user
            ).values_list('thread_id', flat=True)
            qs = qs.filter(
                Q(channel__workspace_id__in=workspace_ids) | Q(dm_thread_id__in=dm_ids)
            )

        if channel_id:
            qs = qs.filter(channel_id=channel_id)
        if user_id:
            qs = qs.filter(user_id=user_id)

        qs = qs.select_related('user', 'user__profile').order_by('-created_at')

        paginator = SearchPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = MessageSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class FileSearchView(APIView):
    def get(self, request):
        q = request.query_params.get('q', '').strip()
        channel_id = request.query_params.get('channel_id')
        mime_type = request.query_params.get('type')

        qs = Attachment.objects.all()

        if q:
            qs = qs.filter(original_filename__icontains=q)

        # Scope to user's content
        workspace_ids = WorkspaceMember.objects.filter(
            user=request.user
        ).values_list('workspace_id', flat=True)
        dm_ids = DMParticipant.objects.filter(
            user=request.user
        ).values_list('thread_id', flat=True)
        qs = qs.filter(
            Q(message__channel__workspace_id__in=workspace_ids) |
            Q(message__dm_thread_id__in=dm_ids)
        )

        if channel_id:
            qs = qs.filter(message__channel_id=channel_id)
        if mime_type:
            qs = qs.filter(mime_type__startswith=mime_type)

        qs = qs.order_by('-created_at')

        paginator = SearchPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AttachmentSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
