import uuid
import datetime as _dt
from datetime import timedelta
from typing import Any, Dict, List, Optional, Tuple

from django.utils import timezone
from dateutil.rrule import rrulestr as _rrulestr

from task.models import TaskTemplate, TaskOverride
from task.serializers import TaskSerializer
from task.views import _parse_iso


def _one_month_context(offset_days_before: int = 0) -> Dict[str, Any]:
    """Return a serializer context covering today → +30 days."""
    now = timezone.now()
    return {
        'start_date': now - timedelta(days=offset_days_before),
        'end_date':   now + timedelta(days=30),
    }


def _compute_preview_overrides(params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Given create_TaskTemplate params, return a list of upcoming occurrence dicts
    for the next 30 days.
    """
    start_dt = _parse_iso(params.get('start_datetime'))
    if not start_dt:
        return []

    now          = timezone.now()
    end_preview  = now + timedelta(days=30)
    rrule_str    = params.get('rrule')

    if params.get('is_recurring') and rrule_str:
        rule         = _rrulestr(rrule_str, dtstart=start_dt.replace(microsecond=0))
        search_start = now if now > start_dt else start_dt
        instances    = rule.between(search_start.replace(microsecond=0), end_preview, inc=True)
        return [{'date': dt.isoformat(), 'status': 'PENDING'} for dt in instances]

    if now <= start_dt <= end_preview:
        return [{'date': start_dt.isoformat(), 'status': 'PENDING'}]
    return []


def _recompute_overrides_for_snapshot(snapshot: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Recompute overrides for an update_TaskTemplate snapshot whose start_datetime
    or rrule may have changed.
    """
    start_dt = _parse_iso(snapshot.get('start_datetime'))
    if not start_dt:
        return snapshot.get('overrides', [])

    now         = timezone.now()
    end_preview = now + timedelta(days=30)
    rrule_str   = snapshot.get('rrule')

    if snapshot.get('is_recurring') and rrule_str:
        rule         = _rrulestr(rrule_str, dtstart=start_dt.replace(microsecond=0))
        search_start = now if now > start_dt else start_dt
        instances    = rule.between(search_start.replace(microsecond=0), end_preview, inc=True)
        return [{'date': dt.isoformat(), 'status': 'PENDING'} for dt in instances]

    if now <= start_dt <= end_preview:
        return [{'date': start_dt.isoformat(), 'status': 'PENDING'}]
    return []


def _apply_start_time_patch(snapshot: Dict[str, Any], params: Dict[str, Any]) -> None:
    """Mutate snapshot in-place: replace just the time part of start_datetime."""
    new_time_str = params.get('start_time')
    if not new_time_str or not snapshot.get('start_datetime'):
        return

    try:
        new_time = _dt.time.fromisoformat(new_time_str)
        orig_dt  = _parse_iso(snapshot['start_datetime'])
        new_dt   = orig_dt.replace(hour=new_time.hour, minute=new_time.minute, second=new_time.second)
        snapshot['start_datetime'] = new_dt.isoformat()
    except Exception:
        pass


def _clean_overrides(task_snapshot: Dict[str, Any]) -> None:
    """Normalise the overrides list inside *task_snapshot* in-place."""
    raw = task_snapshot.get('overrides', [])
    cleaned = []
    for ov in raw:
        if 'date' in ov:
            entry = {'date': ov['date'], 'status': ov.get('status')}
        else:
            entry = {'date': ov.get('instance_datetime'), 'status': ov.get('status')}
        if ov.get('status') == 'RESCHEDULED' and ov.get('new_datetime'):
            entry['new_datetime'] = ov['new_datetime']
        cleaned.append(entry)
    task_snapshot['overrides'] = cleaned


def build_task_snapshot(
    action_name: str,
    params: Dict[str, Any],
    user,
) -> Tuple[Optional[Dict[str, Any]], Optional[uuid.UUID]]:
    """
    Return (task_snapshot, choice_id) for the given AI action.
    """
    if action_name == 'create_TaskTemplate':
        snapshot, choice_id = _snapshot_for_create(params)

    elif action_name in ('update_TaskTemplate', 'delete_TaskTemplate'):
        snapshot, choice_id = _snapshot_for_template_update_or_delete(action_name, params, user)

    elif action_name == 'update_TaskOverride':
        snapshot, choice_id = _snapshot_for_override_update(params, user)

    else:
        return None, None

    if snapshot is not None:
        _clean_overrides(snapshot)

    return snapshot, choice_id


def _snapshot_for_create(params: Dict[str, Any]) -> Tuple[Optional[Dict], Optional[uuid.UUID]]:
    """Build task snapshot and extract choice_id for create_TaskTemplate."""
    choice_id = None

    if params.get('task_id'):
        try:
            choice_id = uuid.UUID(str(params['task_id']))
        except (TypeError, ValueError):
            choice_id = None

    try:
        preview_overrides = _compute_preview_overrides(params)
    except Exception:
        preview_overrides = []

    snapshot = {
        'id':               str(choice_id) if choice_id else params.get('task_id'),
        'title':            params.get('title'),
        'emoji':            params.get('emoji', '📝'),
        'priority':         params.get('priority', 'none'),
        'start_datetime':   params.get('start_datetime'),
        'duration_minutes': params.get('duration_minutes'),
        'reminder_time':    params.get('reminder_time'),
        'is_recurring':     params.get('is_recurring', False),
        'rrule':            params.get('rrule'),
        'timezone':         params.get('timezone', 'UTC'),
        'overrides':        preview_overrides,
    }
    return snapshot, choice_id


def _snapshot_for_template_update_or_delete(
    action_name: str,
    params: Dict[str, Any],
    user,
) -> Tuple[Optional[Dict], Optional[uuid.UUID]]:
    """Build task snapshot for update_TaskTemplate or delete_TaskTemplate."""
    task_id = (
        params.get('task_id')
        or params.get('master_task_id')
        or params.get('id')
    )
    if not task_id:
        return None, None

    try:
        task     = TaskTemplate.objects.get(pk=task_id, user=user, is_deleted=False)
        context  = _one_month_context()
        snapshot = TaskSerializer(task, context=context).data

        if action_name == 'update_TaskTemplate':
            # Apply field patches from params
            for k, v in params.items():
                if k in snapshot and k not in ('id', 'master_task_id', 'task_id'):
                    snapshot[k] = v

            # Patch start time if only the time portion changed
            if 'start_time' in params:
                _apply_start_time_patch(snapshot, params)

            # Recompute overrides when scheduling fields changed
            if any(k in params for k in ('rrule', 'start_time', 'start_datetime')):
                try:
                    snapshot['overrides'] = _recompute_overrides_for_snapshot(snapshot)
                except Exception:
                    pass

        return snapshot, None

    except Exception:
        return None, None


def _snapshot_for_override_update(
    params: Dict[str, Any],
    user,
) -> Tuple[Optional[Dict], Optional[uuid.UUID]]:
    """Build task snapshot for update_TaskOverride."""
    instance_id = (
        params.get('instance_id')
        or params.get('occurrence_id')
        or params.get('id')
    )
    if not instance_id:
        return None, None

    new_datetime     = params.get('new_datetime') or params.get('start_datetime')
    requested_status = params.get('status')

    try:
        context  = _one_month_context(offset_days_before=1)
        override = TaskOverride.objects.get(pk=instance_id, task__user=user, is_deleted=False)
        snapshot = TaskSerializer(override.task, context=context).data

        # Normalise status string
        if isinstance(requested_status, str):
            requested_status = requested_status.upper()
            if requested_status == 'DONE':
                requested_status = TaskOverride.STATUS_COMPLETED

        if snapshot and new_datetime:
            snapshot = _apply_override_reschedule(snapshot, override, new_datetime, requested_status)
        elif snapshot and requested_status:
            snapshot = _apply_override_status(snapshot, override, requested_status)

        return snapshot, None

    except Exception:
        return None, None


def _apply_override_reschedule(
    snapshot: Dict[str, Any],
    override: 'TaskOverride',
    new_datetime: str,
    requested_status: Optional[str],
) -> Dict[str, Any]:
    """Update overrides list to reflect a rescheduled occurrence."""
    parsed_dt = _parse_iso(new_datetime)
    if not parsed_dt:
        return snapshot

    new_status    = requested_status or TaskOverride.STATUS_PENDING
    old_dt        = override.instance_datetime
    updated       = []
    found_new     = False

    for ov in snapshot.get('overrides', []):
        ov_dt = _parse_iso(ov.get('instance_datetime'))
        if ov_dt == old_dt:
            ov['status']       = TaskOverride.STATUS_RESCHEDULED
            ov['new_datetime'] = parsed_dt.isoformat()
        if ov_dt == parsed_dt:
            ov['status'] = new_status
            found_new    = True
        updated.append(ov)

    if not found_new:
        updated.append({'instance_datetime': parsed_dt.isoformat(), 'status': new_status})

    snapshot['overrides'] = updated
    return snapshot


def _apply_override_status(
    snapshot: Dict[str, Any],
    override: 'TaskOverride',
    requested_status: str,
) -> Dict[str, Any]:
    """Update overrides list to reflect a status-only change."""
    old_dt  = override.instance_datetime
    updated = []
    for ov in snapshot.get('overrides', []):
        ov_dt = _parse_iso(ov.get('instance_datetime'))
        if ov_dt == old_dt:
            ov['status'] = requested_status
        updated.append(ov)
    snapshot['overrides'] = updated
    return snapshot
