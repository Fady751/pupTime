from rest_framework import status
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.pagination import PageNumberPagination
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Task
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
        'status', openapi.IN_QUERY,
        description='Filter by status (pending / completed)',
        type=openapi.TYPE_STRING,
        enum=['pending', 'completed'],
    ),
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
        qs = (
            Task.objects
            .filter(user=self.request.user)
            .select_related('user')
            .prefetch_related('repetitions', 'categories')
        )

        task_status = self.request.query_params.get('status')
        if task_status in ('pending', 'completed'):
            qs = qs.filter(status=task_status)

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