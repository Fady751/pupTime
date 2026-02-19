from rest_framework import status
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.utils import timezone

from .models import Task, TaskHistory
from .serializers import TaskSerializer

class IsTaskOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class TaskPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

TASK_FILTER_PARAMS = [
    openapi.Parameter(
        'priority', openapi.IN_QUERY,
        description='Filter by priority (none / low / medium / high)',
        type=openapi.TYPE_STRING,
        enum=['none', 'low', 'medium', 'high'],
    ),
    openapi.Parameter(
        'category', openapi.IN_QUERY,
        description='Filter by InterestCategory id',
        type=openapi.TYPE_INTEGER,
    ),
    openapi.Parameter(
        'ordering', openapi.IN_QUERY,
        description='Sort field. Prefix with - for descending. '
                    'Allowed: start_time, -start_time, priority, -priority, '
                    'end_time, -end_time',
        type=openapi.TYPE_STRING,
    ),
]

ORDERING_WHITELIST = {
    'start_time', '-start_time',
    'end_time', '-end_time',
    'priority', '-priority',
}


class TaskViewSet(ModelViewSet):
    """
    CRUD for the authenticated user's tasks.

    - **GET    /task/**           – list own tasks (filterable, paginated)
    - **POST   /task/**           – create a task (with optional nested repetitions)
    - **GET    /task/{id}/**      – retrieve a single task
    - **PUT    /task/{id}/**      – full update
    - **PATCH  /task/{id}/**      – partial update
    - **DELETE /task/{id}/**      – delete
    """

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, IsTaskOwner]
    pagination_class = TaskPagination

    def get_queryset(self):
        # Handle swagger schema generation (no real user)
        if getattr(self, 'swagger_fake_view', False):
            return Task.objects.none()
            
        qs = (
            Task.objects
            .filter(user=self.request.user)
            .select_related('user')
            .prefetch_related('repetitions', 'categories', 'history')
        )

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
            qs = qs.order_by('-start_time') 
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


    @swagger_auto_schema(
        operation_summary='List own tasks',
        manual_parameters=TASK_FILTER_PARAMS,
        responses={200: TaskSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary='Create a task',
        request_body=TaskSerializer,
        responses={201: TaskSerializer},
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary='Retrieve a task',
        responses={200: TaskSerializer},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary='Full update a task',
        request_body=TaskSerializer,
        responses={200: TaskSerializer},
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary='Partial update a task',
        request_body=TaskSerializer,
        responses={200: TaskSerializer},
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary='Delete a task',
        responses={204: 'Task deleted'},
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    @swagger_auto_schema(
        operation_summary='Mark task as completed',
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'completion_time': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format='date-time',
                    description='Optional completion time (defaults to now)'
                )
            }
        ),
        responses={
            201: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'task': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'completion_time': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
                }
            ),
            404: 'Task not found'
        }
    )
    def complete(self, request, pk=None):
        """Mark a task as completed by creating a TaskHistory record."""
        task = self.get_object()
        
        completion_time = request.data.get('completion_time')
        if completion_time:
            try:
                completion_time = timezone.datetime.fromisoformat(completion_time.replace('Z', '+00:00'))
            except ValueError:
                return Response(
                    {'error': 'Invalid completion_time format. Use ISO format.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            completion_time = timezone.now()
        
        task_history = TaskHistory.objects.create(
            task=task,
            completion_time=completion_time
        )
        
        return Response({
            'id': task_history.id,
            'task': task.id,
            'completion_time': task_history.completion_time.isoformat(),
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    @swagger_auto_schema(
        operation_summary='Remove completion for task',
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'completion_id': openapi.Schema(
                    type=openapi.TYPE_INTEGER,
                    description='ID of specific completion to remove'
                ),
                'date': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format='date',
                    description='Remove latest completion from this date (YYYY-MM-DD)'
                )
            }
        ),
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'message': openapi.Schema(type=openapi.TYPE_STRING),
                    'deleted_completion_time': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
                }
            ),
            404: 'Task not found or no completions exist'
        }
    )
    def uncomplete(self, request, pk=None):
        """Remove a completion for this task. Supports multiple targeting methods."""
        task = self.get_object()
        
        completion_id = request.data.get('completion_id')
        target_date = request.data.get('date')
        
        if completion_id:
            try:
                completion = TaskHistory.objects.get(id=completion_id, task=task)
            except TaskHistory.DoesNotExist:
                return Response(
                    {'error': 'Completion not found for this task'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif target_date:
            try:
                from datetime import datetime
                date_obj = datetime.strptime(target_date, '%Y-%m-%d').date()
                completion = (
                    TaskHistory.objects
                    .filter(task=task, completion_time__date=date_obj)
                    .order_by('-completion_time')
                    .first()
                )
                if not completion:
                    return Response(
                        {'error': f'No completions found for {target_date}'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            completion = (
                TaskHistory.objects
                .filter(task=task)
                .order_by('-completion_time')
                .first()
            )
            if not completion:
                return Response(
                    {'error': 'No completions found for this task'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        deleted_time = completion.completion_time
        completion.delete()
        
        return Response({
            'message': 'Completion removed',
            'deleted_completion_time': deleted_time.isoformat(),
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    @swagger_auto_schema(
        operation_summary='List completion history for task',
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'completion_time': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
                        'date': openapi.Schema(type=openapi.TYPE_STRING, format='date'),
                    }
                )
            ),
            404: 'Task not found'
        }
    )
    def history(self, request, pk=None):
        """List all completion history for this task, ordered by most recent first."""
        task = self.get_object()
        
        completions = (
            TaskHistory.objects
            .filter(task=task)
            .order_by('-completion_time')
        )
        
        history_data = [{
            'id': completion.id,
            'completion_time': completion.completion_time.isoformat(),
            'date': completion.completion_time.date().isoformat(),
        } for completion in completions]
        
        return Response(history_data, status=status.HTTP_200_OK)