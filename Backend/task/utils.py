from datetime import timedelta

from dateutil.rrule import rrulestr
from django.utils import timezone

from .models import TaskOverride


def generate_overrides_for_range(task, start_dt, end_dt):
    if not task.is_recurring or not task.rrule:
        return  

    try:
        rule = rrulestr(task.rrule, dtstart=task.start_datetime.replace(microsecond=0))
    except (ValueError, TypeError):
        return

    instances = list(rule.between(start_dt.replace(microsecond=0), end_dt, inc=True))

    existing = {
        dt.replace(microsecond=0)
        for dt in task.overrides.filter(is_deleted=False).values_list('instance_datetime', flat=True)
        if dt
    }

    new_overrides = [
        TaskOverride(
            task=task,
            instance_datetime=dt,
            status=TaskOverride.STATUS_PENDING,
        )
        for dt in instances
        if dt.replace(microsecond=0) not in existing
    ]

    if new_overrides:
        TaskOverride.objects.bulk_create(new_overrides, ignore_conflicts=True)


def generate_overrides_for_task(task, months_ahead=1):
    if not task.is_recurring or not task.rrule:
        existing = {
            dt.replace(microsecond=0)
            for dt in task.overrides.filter(is_deleted=False).values_list('instance_datetime', flat=True)
            if dt
        }
        if task.start_datetime and task.start_datetime.replace(microsecond=0) not in existing:
            override = TaskOverride(
                task=task,
                instance_datetime=task.start_datetime,
                status=TaskOverride.STATUS_PENDING,
            )
            TaskOverride.objects.bulk_create([override], ignore_conflicts=True)
            return [override]
        return []

    now = timezone.now()
    end_date = now + timedelta(days=30 * months_ahead)

    try:
        rule = rrulestr(task.rrule, dtstart=task.start_datetime.replace(microsecond=0))
    except (ValueError, TypeError):
        return []

    instances = list(rule.between(task.start_datetime.replace(microsecond=0), end_date, inc=True))

    existing = {
        dt.replace(microsecond=0)
        for dt in task.overrides.filter(is_deleted=False).values_list('instance_datetime', flat=True)
        if dt
    }

    new_overrides = [
        TaskOverride(
            task=task,
            instance_datetime=dt,
            status=TaskOverride.STATUS_PENDING,
        )
        for dt in instances
        if dt.replace(microsecond=0) not in existing
    ]

    if new_overrides:
        TaskOverride.objects.bulk_create(new_overrides, ignore_conflicts=True)

    return new_overrides
