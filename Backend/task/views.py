from datetime import datetime

from django.db.models import Q
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from . import docs
from .models import TaskTemplate, TaskOverride
from .serializers import TaskOverrideSerializer, TaskSerializer


class IsTaskOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class TaskPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


ORDERING_WHITELIST = {
    'start_datetime', '-start_datetime',
    'priority', '-priority',
}


def _parse_iso(value):
    """Parse an ISO-8601 string, tolerating a trailing Z."""
    if not value:
        return None
    value = value.strip(" '\"")
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None


@method_decorator(name='list', decorator=docs.list_schema)
@method_decorator(name='create', decorator=docs.create_schema)
@method_decorator(name='retrieve', decorator=docs.retrieve_schema)
@method_decorator(name='update', decorator=docs.update_schema)
@method_decorator(name='partial_update', decorator=docs.partial_update_schema)
@method_decorator(name='destroy', decorator=docs.destroy_schema)
class TaskViewSet(ModelViewSet):
    """
    CRUD for the authenticated user's tasks.

    - **GET    /task/**                – list own tasks (filterable by date range, paginated)
    - **POST   /task/**                – create a task (auto-generates overrides for recurring)
    - **GET    /task/{id}/**           – retrieve a single task
    - **PUT    /task/{id}/**           – full update
    - **PATCH  /task/{id}/**           – partial update
    - **DELETE /task/{id}/**           – soft delete
    - **PATCH  /task/{id}/override/{override_id}/** – update an override status
    """

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, IsTaskOwner]
    pagination_class = TaskPagination

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['start_date'] = _parse_iso(
            self.request.query_params.get('start_date')
        )
        ctx['end_date'] = _parse_iso(
            self.request.query_params.get('end_date')
        )
        ctx['updated_after'] = _parse_iso(
            self.request.query_params.get('updated_after')
        )
        is_deleted_param = self.request.query_params.get('is_deleted')
        if is_deleted_param is not None:
            ctx['is_deleted'] = is_deleted_param.lower() in ('true', '1', 't', 'y', 'yes')
        else:
            ctx['is_deleted'] = False
        return ctx

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return TaskTemplate.objects.none()

        is_deleted = self.get_serializer_context().get('is_deleted', False)

        qs = (
            TaskTemplate.objects
            .filter(user=self.request.user, is_deleted=is_deleted)
            .select_related('user')
            .prefetch_related('overrides', 'categories')
        )
        start_dt = _parse_iso(self.request.query_params.get('start_date'))
        end_dt = _parse_iso(self.request.query_params.get('end_date'))

        if start_dt and end_dt:
            qs = qs.filter(
                Q(
                    start_datetime__gte=start_dt,
                    start_datetime__lte=end_dt,
                )
                | Q(
                    overrides__instance_datetime__gte=start_dt,
                    overrides__instance_datetime__lte=end_dt,
                    overrides__is_deleted=is_deleted,
                )
            ).distinct()

        updated_after = _parse_iso(self.request.query_params.get('updated_after'))
        if updated_after:
            qs = qs.filter(
                Q(updated_at__gte=updated_after)
                | Q(
                    overrides__updated_at__gte=updated_after,
                    overrides__is_deleted=is_deleted,
                )
            ).distinct()

        priority = self.request.query_params.get('priority')
        if priority in ('none', 'low', 'medium', 'high'):
            qs = qs.filter(priority=priority)
        category = self.request.query_params.get('category')
        if category:
            try:
                qs = qs.filter(categories__id=int(category))
            except (ValueError, TypeError):
                pass

        ordering = self.request.query_params.get('ordering')
        if ordering in ORDERING_WHITELIST:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('-start_datetime')

        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])

    @action(
        detail=True,
        methods=['patch'],
        url_path=r'override/(?P<override_id>[0-9a-f-]+)',
        url_name='update-override',
    )
    @docs.override_schema
    def override(self, request, pk=None, override_id=None):
        """Update the status of a single TaskOverride (complete, skip, reschedule …)."""
        task = self.get_object()

        try:
            task_override = task.overrides.get(id=override_id, is_deleted=False)
        except TaskOverride.DoesNotExist:
            return Response(
                {'error': 'Override not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get('status')
        valid_statuses = dict(TaskOverride.STATUS_CHOICES)
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Choose from: {list(valid_statuses.keys())}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status == TaskOverride.STATUS_RESCHEDULED:
            new_dt = request.data.get('new_datetime')
            if not new_dt:
                return Response(
                    {'error': 'new_datetime is required when status is RESCHEDULED.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            parsed = _parse_iso(new_dt)
            if not parsed:
                return Response(
                    {'error': 'Invalid new_datetime format. Use ISO format.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            task_override.new_datetime = parsed

        task_override.status = new_status
        task_override.save()

        if new_status == TaskOverride.STATUS_RESCHEDULED:
            new_override, _ = TaskOverride.objects.get_or_create(
                task=task,
                instance_datetime=parsed,
                defaults={'status': TaskOverride.STATUS_PENDING},
            )
            return Response(
                {
                    'rescheduled': TaskOverrideSerializer(task_override).data,
                    'new_instance': TaskOverrideSerializer(new_override).data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            TaskOverrideSerializer(task_override).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['get'])
    @docs.history_schema
    def history(self, request, pk=None):
        """List all past overrides for a specific task template."""
        task = self.get_object()
        qs = task.overrides.filter(is_deleted=False).order_by('-instance_datetime')

        start_dt = _parse_iso(request.query_params.get('start_date'))
        end_dt = _parse_iso(request.query_params.get('end_date'))

        if start_dt and end_dt:
            qs = qs.filter(
                instance_datetime__gte=start_dt,
                instance_datetime__lte=end_dt,
            )

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = TaskOverrideSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TaskOverrideSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
