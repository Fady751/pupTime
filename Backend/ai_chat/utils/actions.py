import datetime as dt
import json as _json
from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from task.models import TaskTemplate, TaskOverride
from task.serializers import TaskSerializer, TaskOverrideSerializer
from task.views import _parse_iso
from task.utils import generate_overrides_for_task


def execute_action(user, action):
    if not isinstance(action, dict):
        raise ValidationError({'actions': 'Each action must be an object.'})

    action_name = action.get('action_name')
    params = action.get('params') or {}

    if isinstance(params, str):
        try:
            params = _json.loads(params)
        except (_json.JSONDecodeError, TypeError):
            raise ValidationError({'params': 'Action params is not valid JSON.'})

    if not isinstance(params, dict):
        raise ValidationError({'actions': 'Each action params value must be an object.'})

    for alias in ['task_name', 'name']:
        if alias in params and 'title' not in params:
            params['title'] = params.pop(alias)
            break

    if action_name == 'create_TaskTemplate':
        requested_task_id = params.get('task_id')
        if requested_task_id:
            params = {**params, 'id': requested_task_id}
            params.pop('task_id', None)

        if not params.get('start_datetime'):
            now = timezone.now()
            default_dt = now.replace(hour=9, minute=0, second=0, microsecond=0)
            if default_dt < now:
                default_dt = now
            params['start_datetime'] = default_dt.isoformat()

        if params.get('rrule') and not params.get('is_recurring'):
            params['is_recurring'] = True

        if not params.get('emoji'):
            params['emoji'] = "📝"

        serializer = TaskSerializer(data=params)
        serializer.is_valid(raise_exception=True)
        task = serializer.save(user=user)
        return {'action_name': action_name, 'task_id': str(task.id), 'task_data': serializer.data}

    if action_name == 'update_TaskTemplate':
        task_id = params.get('task_id') or params.get('id') or params.get('master_task_id')
        if not task_id:
            raise ValidationError({'task_id': 'task_id or id is required for update_TaskTemplate.'})
        try:
            task = TaskTemplate.objects.get(pk=task_id, user=user, is_deleted=False)
        except TaskTemplate.DoesNotExist:
            raise ValidationError({'task_id': f'Task {task_id} not found.'})

        update_data = {k: v for k, v in params.items() if k not in ['task_id', 'id', 'master_task_id']}

        if 'start_time' in update_data:
            time_str = update_data.pop('start_time')
            if task.start_datetime:
                try:
                    new_time = dt.time.fromisoformat(time_str)
                    new_dt = task.start_datetime.replace(
                        hour=new_time.hour, minute=new_time.minute,
                        second=new_time.second, microsecond=0,
                    )
                    update_data['start_datetime'] = new_dt.isoformat()
                except ValueError:
                    pass

        if update_data.get('rrule') and not update_data.get('is_recurring'):
            update_data['is_recurring'] = True

        should_regenerate = (
            'rrule' in update_data or
            ('start_datetime' in update_data and task.is_recurring)
        )
        if should_regenerate:
            TaskOverride.objects.filter(
                task=task, instance_datetime__gt=timezone.now(),
                status=TaskOverride.STATUS_PENDING, is_deleted=False,
            ).update(is_deleted=True)

        serializer = TaskSerializer(task, data=update_data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_task = serializer.save()
        if should_regenerate:
            generate_overrides_for_task(updated_task)

        task_data = TaskSerializer(
            updated_task,
            context={'start_date': timezone.now(), 'end_date': timezone.now() + timedelta(days=30)},
        ).data
        return {'action_name': action_name, 'task_id': str(updated_task.id), 'task_data': task_data}

    if action_name == 'update_TaskOverride':
        instance_id = params.get('instance_id') or params.get('occurrence_id') or params.get('id')
        requested_status = params.get('status')
        new_dt_str = params.get('new_datetime') or params.get('start_datetime')
        notes = params.get('notes')

        if isinstance(requested_status, str):
            requested_status = requested_status.upper()
            if requested_status == 'DONE':
                requested_status = TaskOverride.STATUS_COMPLETED

        if not instance_id:
            raise ValidationError({'instance_id': 'instance_id (or occurrence_id) is required.'})
        try:
            override = TaskOverride.objects.get(pk=instance_id, task__user=user, is_deleted=False)
        except TaskOverride.DoesNotExist:
            raise ValidationError({'instance_id': 'Instance not found.'})

        if not new_dt_str and requested_status == TaskOverride.STATUS_RESCHEDULED:
            raise ValidationError({'new_datetime': 'Required for rescheduling.'})

        if new_dt_str:
            parsed_dt = _parse_iso(new_dt_str)
            if not parsed_dt:
                raise ValidationError({'new_datetime': 'Invalid format.'})
            override.new_datetime = parsed_dt
            override.status = TaskOverride.STATUS_RESCHEDULED
            new_instance_status = requested_status or TaskOverride.STATUS_PENDING
            new_override, created = TaskOverride.objects.get_or_create(
                task=override.task, instance_datetime=parsed_dt,
                defaults={'status': new_instance_status},
            )
            if not created and requested_status:
                new_override.status = new_instance_status
                new_override.save(update_fields=['status'])
        else:
            override.status = requested_status or TaskOverride.STATUS_RESCHEDULED

        if notes:
            override.notes = notes
        override.save()
        return {
            'action_name': action_name,
            'instance_id': str(override.id),
            'status': override.status,
            'instance_data': TaskOverrideSerializer(override).data,
        }

    if action_name == 'delete_TaskTemplate':
        task_id = params.get('task_id') or params.get('master_task_id') or params.get('id')
        if not task_id:
            raise ValidationError({'task_id': 'task_id or id is required for delete_TaskTemplate.'})
        try:
            task = TaskTemplate.objects.get(pk=task_id, user=user, is_deleted=False)
        except TaskTemplate.DoesNotExist:
            raise ValidationError({'task_id': 'Task not found.'})
        task.is_deleted = True
        task.save(update_fields=['is_deleted'])
        return {'action_name': action_name, 'task_id': str(task.id)}

    raise ValidationError({'action_name': f'Unsupported action: {action_name}'})
