from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from .serializers import TaskSerializer, TaskOverrideSerializer

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
        'start_date', openapi.IN_QUERY,
        description='Start of date range (ISO format, e.g. 2026-02-22T00:00:00Z)',
        type=openapi.TYPE_STRING, format='date-time',
    ),
    openapi.Parameter(
        'end_date', openapi.IN_QUERY,
        description='End of date range (ISO format, e.g. 2026-03-22T23:59:59Z)',
        type=openapi.TYPE_STRING, format='date-time',
    ),
    openapi.Parameter(
        'ordering', openapi.IN_QUERY,
        description='Sort field. Prefix with - for descending. '
                    'Allowed: start_datetime, -start_datetime, priority, -priority',
        type=openapi.TYPE_STRING,
    ),
]

override_schema = swagger_auto_schema(
    operation_summary='Update an override status',
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'status': openapi.Schema(
                type=openapi.TYPE_STRING,
                enum=['PENDING', 'COMPLETED', 'SKIPPED', 'RESCHEDULED', 'FAILED'],
            ),
            'new_datetime': openapi.Schema(
                type=openapi.TYPE_STRING, format='date-time',
                description='Required when status is RESCHEDULED',
            ),
        },
    ),
    responses={200: TaskOverrideSerializer},
)

list_schema = swagger_auto_schema(
    operation_summary='List own tasks',
    manual_parameters=TASK_FILTER_PARAMS,
    responses={200: TaskSerializer(many=True)},
)

create_schema = swagger_auto_schema(
    operation_summary='Create a task',
    request_body=TaskSerializer,
    responses={201: TaskSerializer},
)

retrieve_schema = swagger_auto_schema(
    operation_summary='Retrieve a task',
    responses={200: TaskSerializer},
)

update_schema = swagger_auto_schema(
    operation_summary='Full update a task',
    request_body=TaskSerializer,
    responses={200: TaskSerializer},
)

partial_update_schema = swagger_auto_schema(
    operation_summary='Partial update a task',
    request_body=TaskSerializer,
    responses={200: TaskSerializer},
)

destroy_schema = swagger_auto_schema(
    operation_summary='Delete a task (soft delete)',
    responses={204: 'Task deleted'},
)

history_schema = swagger_auto_schema(
    operation_summary='List past overrides for a task template',
    manual_parameters=[
        openapi.Parameter(
            'start_date', openapi.IN_QUERY,
            description='Start of date range (ISO format, e.g. 2026-02-22T00:00:00Z)',
            type=openapi.TYPE_STRING, format='date-time',
        ),
        openapi.Parameter(
            'end_date', openapi.IN_QUERY,
            description='End of date range (ISO format, e.g. 2026-03-22T23:59:59Z)',
            type=openapi.TYPE_STRING, format='date-time',
        ),
    ],
    responses={200: TaskOverrideSerializer(many=True)},
)
