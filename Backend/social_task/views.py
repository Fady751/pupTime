from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import SocialTask, SocialTaskParticipant, ParticipantStatus
from .serializers import (
    SocialTaskCreateSerializer, AddSubTaskSerializer, SocialTaskUpdateSerializer,
    SocialTaskDetailSerializer, SocialTaskListSerializer, SubTaskSerializer,
)
from .services import (
    create_social_task, add_sub_task, accept_invite, decline_invite,
    cancel_social_task, update_node,
)


class _Pagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'


class SocialTaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tasks = (
            SocialTask.objects
            .filter(participants__user=request.user, parent__isnull=True, is_deleted=False)
            .select_related('initiator')
            .distinct()
            .order_by('-created_at')
        )
        paginator = _Pagination()
        page = paginator.paginate_queryset(tasks, request)
        return paginator.get_paginated_response(
            SocialTaskListSerializer(page, many=True, context={'request': request}).data
        )

    def post(self, request):
        serializer = SocialTaskCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        task = create_social_task(
            initiator=request.user,
            data={
                'title': vd['title'],
                'description': vd.get('description', ''),
                'duration_minutes': vd['duration_minutes'],
                'scheduled_at': vd.get('scheduled_at'),
            },
            participant_ids=vd.get('participant_ids', []),
            sub_tasks_data=[
                {
                    'title': s['title'],
                    'description': s.get('description', ''),
                    'duration_minutes': s['duration_minutes'],
                    'scheduled_at': s.get('scheduled_at'),
                }
                for s in vd.get('sub_tasks', [])
            ],
        )
        return Response(SocialTaskDetailSerializer(task).data, status=status.HTTP_201_CREATED)


class SocialTaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_node(self, pk):
        return get_object_or_404(SocialTask, pk=pk, is_deleted=False)

    def get(self, request, pk):
        node = self._get_node(pk)
        root = node.root
        if not root.participants.filter(user=request.user).exists():
            return Response({'detail': 'Not a participant.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(SocialTaskDetailSerializer(root).data)

    def patch(self, request, pk):
        node = self._get_node(pk)
        root = node.root
        if root.initiator != request.user:
            return Response({'detail': 'Only the initiator can edit.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = SocialTaskUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        update_node(node, serializer.validated_data)
        root.refresh_from_db()
        return Response(SocialTaskDetailSerializer(root).data)

    def delete(self, request, pk):
        node = self._get_node(pk)
        root = node.root
        if root.initiator != request.user:
            return Response({'detail': 'Only the initiator can cancel.'}, status=status.HTTP_403_FORBIDDEN)
        if node.parent is not None:
            return Response(
                {'detail': 'Cannot cancel a sub-task. Cancel the root task.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cancel_social_task(root)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SocialTaskAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        task = get_object_or_404(SocialTask, pk=pk, parent__isnull=True, is_deleted=False)
        try:
            participant = accept_invite(task, request.user)
        except SocialTaskParticipant.DoesNotExist:
            return Response(
                {'detail': 'No pending invite found for this user.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        task.refresh_from_db()
        return Response({'status': task.status, 'participant_status': participant.status})


class SocialTaskDeclineView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        task = get_object_or_404(SocialTask, pk=pk, parent__isnull=True, is_deleted=False)
        try:
            participant = decline_invite(task, request.user)
        except SocialTaskParticipant.DoesNotExist:
            return Response(
                {'detail': 'No pending invite found for this user.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'participant_status': participant.status})


class SocialTaskInvitesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tasks = (
            SocialTask.objects
            .filter(
                participants__user=request.user,
                participants__status=ParticipantStatus.INVITED,
                parent__isnull=True,
                is_deleted=False,
            )
            .select_related('initiator')
            .distinct()
            .order_by('-created_at')
        )
        paginator = _Pagination()
        page = paginator.paginate_queryset(tasks, request)
        return paginator.get_paginated_response(
            SocialTaskListSerializer(page, many=True, context={'request': request}).data
        )


class SocialTaskAddSubTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        root = get_object_or_404(SocialTask, pk=pk, is_deleted=False)
        if root.parent is not None:
            return Response(
                {'detail': 'Cannot add a sub-task to a sub-task.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if root.initiator != request.user:
            return Response(
                {'detail': 'Only the initiator can add sub-tasks.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = AddSubTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        sub = add_sub_task(root, {
            'title': vd['title'],
            'description': vd.get('description', ''),
            'duration_minutes': vd['duration_minutes'],
            'scheduled_at': vd.get('scheduled_at'),
        })
        return Response(SubTaskSerializer(sub).data, status=status.HTTP_201_CREATED)
