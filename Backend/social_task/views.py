from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from user.models import User
from .models import SocialTask, SocialTaskParticipant, SocialTaskStatus, ParticipantStatus
from .serializers import (
    SocialTaskCreateSerializer, AddSubTaskSerializer, SocialTaskUpdateSerializer,
    SocialTaskDetailSerializer, SocialTaskListSerializer, SubTaskSerializer,
    InviteParticipantSerializer,
)
from .services import (
    create_social_task, add_sub_task, accept_invite, decline_invite,
    cancel_social_task, update_node, invite_participant,
)


class _Pagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'


class SocialTaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary='List social tasks',
        operation_description='Returns all social tasks (root only) where the authenticated user is a participant.',
        responses={200: SocialTaskListSerializer(many=True)},
    )
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

    @swagger_auto_schema(
        operation_summary='Create a social task',
        operation_description=(
            'Create a shared task and optionally invite friends and add sub-tasks in one request. '
            'All participant_ids must be accepted friends of the caller.'
        ),
        request_body=SocialTaskCreateSerializer,
        responses={
            201: SocialTaskDetailSerializer,
            400: openapi.Response('Validation error — bad fields or non-friend participant'),
        },
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
        return Response(SocialTaskDetailSerializer(task, context={'request': request}).data, status=status.HTTP_201_CREATED)


class SocialTaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_node(self, pk):
        return get_object_or_404(SocialTask, pk=pk, is_deleted=False)

    @swagger_auto_schema(
        operation_summary='Get social task detail',
        operation_description='Returns root task with participants and sub-tasks. Only accessible by participants.',
        responses={
            200: SocialTaskDetailSerializer,
            403: openapi.Response('Not a participant'),
        },
    )
    def get(self, request, pk):
        node = self._get_node(pk)
        root = node.root
        if not root.participants.filter(user=request.user).exists():
            return Response({'detail': 'Not a participant.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(SocialTaskDetailSerializer(root, context={'request': request}).data)

    @swagger_auto_schema(
        operation_summary='Update social task or sub-task',
        operation_description=(
            'Initiator-only. pk can be a root task or a sub-task. '
            'Changing scheduled_at on a confirmed task propagates to all participants\' TaskTemplates.'
        ),
        request_body=SocialTaskUpdateSerializer,
        responses={
            200: SocialTaskDetailSerializer,
            403: openapi.Response('Not the initiator'),
        },
    )
    def patch(self, request, pk):
        node = self._get_node(pk)
        root = node.root
        if root.initiator != request.user:
            return Response({'detail': 'Only the initiator can edit.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = SocialTaskUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        update_node(node, serializer.validated_data)
        root.refresh_from_db()
        return Response(SocialTaskDetailSerializer(root, context={'request': request}).data)

    @swagger_auto_schema(
        operation_summary='Cancel social task',
        operation_description=(
            'Initiator-only. Soft-deletes the root task, all sub-tasks, '
            'and all participants\' personal TaskTemplates.'
        ),
        responses={
            204: openapi.Response('Cancelled'),
            400: openapi.Response('Cannot cancel a sub-task directly'),
            403: openapi.Response('Not the initiator'),
        },
    )
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

    @swagger_auto_schema(
        operation_summary='Accept a social task invite',
        operation_description=(
            'Mark the caller\'s participation as accepted. '
            'When all invitees have accepted, the task moves to confirmed and personal TaskTemplates are created.'
        ),
        responses={
            200: openapi.Response('Accepted', schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'status': openapi.Schema(type=openapi.TYPE_STRING),
                    'participant_status': openapi.Schema(type=openapi.TYPE_STRING),
                },
            )),
            400: openapi.Response('No pending invite found'),
        },
    )
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

    @swagger_auto_schema(
        operation_summary='Decline a social task invite',
        operation_description='Mark the caller\'s participation as declined. The initiator is notified.',
        responses={
            200: openapi.Response('Declined', schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'participant_status': openapi.Schema(type=openapi.TYPE_STRING),
                },
            )),
            400: openapi.Response('No pending invite found'),
        },
    )
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

    @swagger_auto_schema(
        operation_summary='List pending invites',
        operation_description='Returns social tasks where the caller has a pending (invited) status.',
        responses={200: SocialTaskListSerializer(many=True)},
    )
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


class SocialTaskInviteView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary='Invite participants',
        operation_description=(
            'Initiator-only. Invite one or more friends to an existing social task. '
            'If the task is already confirmed, each invitee\'s personal TaskTemplates are created '
            'immediately when they accept.'
        ),
        request_body=InviteParticipantSerializer,
        responses={
            200: SocialTaskDetailSerializer,
            400: openapi.Response('Validation error — non-friend or already a participant'),
            403: openapi.Response('Not the initiator'),
        },
    )
    def post(self, request, pk):
        root = get_object_or_404(SocialTask, pk=pk, parent__isnull=True, is_deleted=False)
        if root.initiator != request.user:
            return Response({'detail': 'Only the initiator can invite.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = InviteParticipantSerializer(
            data=request.data,
            context={'request': request, 'root': root},
        )
        serializer.is_valid(raise_exception=True)

        for uid in serializer.validated_data['participant_ids']:
            user = User.objects.get(id=uid)
            invite_participant(root, user)

        root.refresh_from_db()
        return Response(SocialTaskDetailSerializer(root, context={'request': request}).data)


class SocialTaskAddSubTaskView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary='Add a sub-task',
        operation_description=(
            'Initiator-only. pk must be a root task. '
            'If the root is already confirmed and the sub-task has a scheduled_at, '
            'personal TaskTemplates are created immediately for all participants.'
        ),
        request_body=AddSubTaskSerializer,
        responses={
            201: SubTaskSerializer,
            400: openapi.Response('pk is a sub-task, not a root'),
            403: openapi.Response('Not the initiator'),
        },
    )
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
