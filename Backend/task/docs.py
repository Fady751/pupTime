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
    openapi.Parameter(
        'updated_after', openapi.IN_QUERY,
        description=(
            'Delta-sync filter (ISO format, e.g. 2026-02-23T13:36:15.637244Z). '
            'Returns task templates whose own updated_at OR any of their overrides\' '
            'updated_at is >= this value. '
            'The overrides array inside each template is also filtered to only '
            'include overrides updated_at >= this value.'
        ),
        type=openapi.TYPE_STRING, format='date-time',
    ),
]

# Response schema for a RESCHEDULED override action
_RESCHEDULED_RESPONSE = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'rescheduled': openapi.Schema(
            type=openapi.TYPE_OBJECT,
            description='The original override, now marked as RESCHEDULED',
            properties={
                'id': openapi.Schema(type=openapi.TYPE_STRING, format='uuid'),
                'instance_datetime': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
                'status': openapi.Schema(type=openapi.TYPE_STRING, example='RESCHEDULED'),
                'new_datetime': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
                'created_at': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
                'updated_at': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
            },
        ),
        'new_instance': openapi.Schema(
            type=openapi.TYPE_OBJECT,
            description='The newly created PENDING override at new_datetime',
            properties={
                'id': openapi.Schema(type=openapi.TYPE_STRING, format='uuid'),
                'instance_datetime': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
                'status': openapi.Schema(type=openapi.TYPE_STRING, example='PENDING'),
                'new_datetime': openapi.Schema(type=openapi.TYPE_STRING, format='date-time', x_nullable=True),
                'created_at': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
                'updated_at': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
            },
        ),
    },
)

override_schema = swagger_auto_schema(
    operation_summary='Update an override status',
    operation_description=(
        'Update the status of a single TaskOverride.\n\n'
        '- **COMPLETED / SKIPPED / FAILED / PENDING**: returns the updated override object.\n'
        '- **RESCHEDULED**: requires `new_datetime`. Marks the original override as RESCHEDULED '
        'and creates a new PENDING override at `new_datetime`. '
        'Returns `{ rescheduled: <original>, new_instance: <new> }`.'
    ),
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['status'],
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
    responses={
        200: openapi.Response(
            description='Override updated. Shape differs when status=RESCHEDULED (see description).',
            schema=TaskOverrideSerializer,
        ),
    },
)

list_schema = swagger_auto_schema(
    operation_summary='List own tasks',
    manual_parameters=TASK_FILTER_PARAMS,
    responses={200: TaskSerializer(many=True)},
)

create_schema = swagger_auto_schema(
    operation_summary='Create a task',
    operation_description=(
        'Creates a new task template and auto-generates overrides based on the rrule.\n\n'
        'Optionally, pass `initial_overrides` to set specific dates with explicit statuses '
        '(e.g. marking past instances as COMPLETED). These are upserted after the rrule '
        'overrides are generated, so they override any auto-generated status for those dates.'
    ),
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['title', 'start_datetime'],
        properties={
            'title': openapi.Schema(type=openapi.TYPE_STRING),
            'start_datetime': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
            'reminder_time': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
            'duration_minutes': openapi.Schema(type=openapi.TYPE_INTEGER),
            'priority': openapi.Schema(type=openapi.TYPE_STRING, enum=['none', 'low', 'medium', 'high']),
            'emoji': openapi.Schema(type=openapi.TYPE_STRING),
            'categories': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_INTEGER)),
            'is_recurring': openapi.Schema(type=openapi.TYPE_BOOLEAN),
            'rrule': openapi.Schema(type=openapi.TYPE_STRING, description='e.g. FREQ=DAILY or FREQ=WEEKLY;BYDAY=MO'),
            'timezone': openapi.Schema(type=openapi.TYPE_STRING, description='e.g. Africa/Cairo'),
            'initial_overrides': openapi.Schema(
                type=openapi.TYPE_ARRAY,
                description='Optional list of overrides to upsert after auto-generation.',
                items=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    required=['instance_datetime', 'status'],
                    properties={
                        'instance_datetime': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
                        'status': openapi.Schema(
                            type=openapi.TYPE_STRING,
                            enum=['PENDING', 'COMPLETED', 'SKIPPED', 'RESCHEDULED', 'FAILED'],
                        ),
                    },
                ),
            ),
        },
    ),
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
    request_body=TaskSerializer(partial=True),
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
