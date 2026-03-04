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
    openapi.Parameter(
        'is_deleted', openapi.IN_QUERY,
        description='Filter by deleted status. If not provided, defaults to false (only active tasks)',
        type=openapi.TYPE_BOOLEAN,
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
        '- **COMPLETED / SKIPPED / FAILED / PENDING**: only `status` is required.\n'
        '- **RESCHEDULED**: `status` + `new_instance` object are required.\n'
        '  - `new_instance.new_date` — required, the datetime for the new instance.\n'
        '  - `new_instance.id` — optional UUID, backend auto-generates if omitted.\n'
        '  - `new_instance.status` — optional, defaults to `PENDING`.\n\n'
        'Returns `{ rescheduled: <original>, new_instance: <new> }` when RESCHEDULED, '
        'otherwise returns the updated override object.'
    ),
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['status'],
        properties={
            'status': openapi.Schema(
                type=openapi.TYPE_STRING,
                enum=['PENDING', 'COMPLETED', 'SKIPPED', 'RESCHEDULED', 'FAILED'],
                description='New status for the current override.',
            ),
            'new_instance': openapi.Schema(
                type=openapi.TYPE_OBJECT,
                description='Required when status is RESCHEDULED.',
                properties={
                    'new_date': openapi.Schema(
                        type=openapi.TYPE_STRING, format='date-time',
                        description='Required. Date/time for the new override instance.',
                    ),
                    'id': openapi.Schema(
                        type=openapi.TYPE_STRING, format='uuid',
                        description='Optional. UUID for the new instance. Auto-generated if not provided.',
                    ),
                    'status': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        enum=['PENDING', 'COMPLETED', 'SKIPPED', 'RESCHEDULED', 'FAILED'],
                        description='Optional. Status for the new instance. Defaults to PENDING.',
                    ),
                },
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

delete_override_schema = swagger_auto_schema(
    operation_summary='Delete an override (soft delete)',
    operation_description=(
        'Soft-deletes a single TaskOverride by setting `is_deleted=True`.\n\n'
        'The override will no longer appear in normal queries but is preserved in the database.'
    ),
    responses={
        204: 'Override deleted.',
        404: 'Override not found.',
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
            'reminder_time': openapi.Schema(
                type=openapi.TYPE_INTEGER,
                description='Minutes before the task start to trigger a reminder (e.g. 10, 30, 60). Must be non-negative.',
            ),
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
                        'id': openapi.Schema(
                            type=openapi.TYPE_STRING, format='uuid',
                            description='Optional. UUID for this override. Auto-generated if omitted.',
                        ),
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

_OVERRIDE_ITEM = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    required=['instance_datetime', 'status'],
    properties={
        'id': openapi.Schema(
            type=openapi.TYPE_STRING, format='uuid',
            description=(
                'Optional. When provided: looks up the override by this ID. '
                'If found, updates it. If not found, creates a new row with this ID. '
                'When omitted: looks up by instance_datetime instead.'
            ),
        ),
        'instance_datetime': openapi.Schema(
            type=openapi.TYPE_STRING, format='date-time',
            description=(
                'The scheduled datetime for this override instance. '
                'Used as the lookup key when id is not provided. '
                'If id is provided, this value is written as-is (and must not conflict with another override).'
            ),
        ),
        'status': openapi.Schema(
            type=openapi.TYPE_STRING,
            enum=['PENDING', 'COMPLETED', 'SKIPPED', 'RESCHEDULED', 'FAILED'],
        ),
    },
)

_OVERRIDE_RESPONSE_ITEM = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'id': openapi.Schema(type=openapi.TYPE_STRING, format='uuid'),
        'instance_datetime': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
        'status': openapi.Schema(type=openapi.TYPE_STRING),
        'new_datetime': openapi.Schema(type=openapi.TYPE_STRING, format='date-time', x_nullable=True),
        'created_at': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
        'updated_at': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
    },
)

_UPDATE_RESPONSE_200 = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    description=(
        'Returned when overrides were upserted/deleted OR when the recurrence rule changed. '
        '`new_overrides` is only present when the recurrence rule changed.'
    ),
    properties={
        'updated_overrides': openapi.Schema(
            type=openapi.TYPE_ARRAY,
            description='Overrides that were upserted from the `overrides` field.',
            items=_OVERRIDE_RESPONSE_ITEM,
        ),
        'deleted_overrides': openapi.Schema(
            type=openapi.TYPE_ARRAY,
            description=(
                'Overrides that were soft-deleted. Includes both explicitly deleted ones '
                '(from `deleted_overrides` field) and pending future ones removed due to '
                'a recurrence rule change.'
            ),
            items=_OVERRIDE_RESPONSE_ITEM,
        ),
        'new_overrides': openapi.Schema(
            type=openapi.TYPE_ARRAY,
            description='Only present when the recurrence rule changed. Newly generated PENDING overrides.',
            items=_OVERRIDE_RESPONSE_ITEM,
        ),
    },
)

_UPDATE_FIELDS = {
    'title': openapi.Schema(type=openapi.TYPE_STRING),
    'start_datetime': openapi.Schema(type=openapi.TYPE_STRING, format='date-time'),
    'reminder_time': openapi.Schema(
        type=openapi.TYPE_INTEGER,
        description='Minutes before the task start to trigger a reminder. Must be non-negative.',
    ),
    'duration_minutes': openapi.Schema(type=openapi.TYPE_INTEGER),
    'priority': openapi.Schema(type=openapi.TYPE_STRING, enum=['none', 'low', 'medium', 'high']),
    'emoji': openapi.Schema(type=openapi.TYPE_STRING),
    'categories': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_INTEGER)),
    'is_recurring': openapi.Schema(type=openapi.TYPE_BOOLEAN),
    'rrule': openapi.Schema(type=openapi.TYPE_STRING, description='e.g. FREQ=DAILY or FREQ=WEEKLY;BYDAY=MO'),
    'timezone': openapi.Schema(type=openapi.TYPE_STRING, description='e.g. Africa/Cairo'),
    'overrides': openapi.Schema(
        type=openapi.TYPE_ARRAY,
        description=(
            'Optional. Overrides to upsert.\n'
            '- **With `id`**: looks up by ID → updates if found, creates with that ID if not.\n'
            '- **Without `id`**: looks up by `instance_datetime` → updates if found, creates (auto ID) if not.\n'
            '- Returns `400` if `instance_datetime` conflicts with another existing override.'
        ),
        items=_OVERRIDE_ITEM,
    ),
    'deleted_overrides': openapi.Schema(
        type=openapi.TYPE_ARRAY,
        description='Optional. List of override UUIDs to soft-delete.',
        items=openapi.Schema(type=openapi.TYPE_STRING, format='uuid'),
    ),
}

update_schema = swagger_auto_schema(
    operation_summary='Full update a task',
    operation_description=(
        'Replaces all editable fields on the task template.\n\n'
        '**Override operations** (both optional):\n'
        '- `overrides` — upsert overrides. With `id`: lookup by ID. Without `id`: lookup by `instance_datetime`.\n'
        '- `deleted_overrides` — array of override UUIDs to soft-delete.\n\n'
        '**Responses:**\n'
        '- `204` — only template fields changed, no override operations performed.\n'
        '- `200` — at least one override was upserted/deleted, OR the recurrence rule changed '
        '(in which case `new_overrides` is also included).\n'
        '- `400` — validation error or `instance_datetime` conflict in `overrides`.'
    ),
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['title', 'start_datetime'],
        properties=_UPDATE_FIELDS,
    ),
    responses={
        204: 'Task updated. No override changes.',
        200: openapi.Response(description='Task updated with override changes.', schema=_UPDATE_RESPONSE_200),
        400: 'Validation error or instance_datetime conflict in overrides.',
    },
)

partial_update_schema = swagger_auto_schema(
    operation_summary='Partial update a task',
    operation_description=(
        'Updates only the provided fields on the task template.\n\n'
        '**Override operations** (both optional):\n'
        '- `overrides` — upsert overrides. With `id`: lookup by ID. Without `id`: lookup by `instance_datetime`.\n'
        '- `deleted_overrides` — array of override UUIDs to soft-delete.\n\n'
        '**Responses:**\n'
        '- `204` — only template fields changed, no override operations performed.\n'
        '- `200` — at least one override was upserted/deleted, OR the recurrence rule changed '
        '(in which case `new_overrides` is also included).\n'
        '- `400` — validation error or `instance_datetime` conflict in `overrides`.'
    ),
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties=_UPDATE_FIELDS,
    ),
    responses={
        204: 'Task updated. No override changes.',
        200: openapi.Response(description='Task updated with override changes.', schema=_UPDATE_RESPONSE_200),
        400: 'Validation error or instance_datetime conflict in overrides.',
    },
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
