from django.utils import timezone as tz

from task.models import TaskTemplate
from .models import (
    SocialTask, SocialTaskParticipant, SocialTaskNodeTask,
    SocialTaskStatus, ParticipantStatus,
)


def _create_personal_task(node: SocialTask, participant: SocialTaskParticipant):
    task = TaskTemplate.objects.create(
        user=participant.user,
        title=node.title,
        start_datetime=node.scheduled_at,
        duration_minutes=node.duration_minutes,
        is_recurring=False,
        timezone='UTC',
    )
    SocialTaskNodeTask.objects.create(node=node, participant=participant, task=task)


def _create_all_personal_tasks(root: SocialTask):
    nodes = [root] + list(root.sub_tasks.filter(is_deleted=False))
    for participant in root.participants.all():
        for node in nodes:
            if node.scheduled_at:
                _create_personal_task(node, participant)


def _try_confirm(root: SocialTask):
    non_initiator = root.participants.exclude(user=root.initiator)
    if not non_initiator.exists():
        return
    still_invited = non_initiator.filter(status=ParticipantStatus.INVITED).exists()
    any_declined = non_initiator.filter(status=ParticipantStatus.DECLINED).exists()
    if not still_invited and not any_declined:
        root.status = SocialTaskStatus.CONFIRMED
        root.save(update_fields=['status'])
        _create_all_personal_tasks(root)


def create_social_task(
    initiator, data: dict, participant_ids: list, sub_tasks_data: list
) -> SocialTask:
    from user.models import User

    root = SocialTask.objects.create(
        initiator=initiator,
        title=data['title'],
        description=data.get('description', ''),
        duration_minutes=data['duration_minutes'],
        scheduled_at=data.get('scheduled_at'),
    )

    SocialTaskParticipant.objects.create(
        social_task=root,
        user=initiator,
        status=ParticipantStatus.ACCEPTED,
        rsvp_at=tz.now(),
    )

    for uid in participant_ids:
        user = User.objects.get(id=uid)
        SocialTaskParticipant.objects.create(social_task=root, user=user)
        # TODO: send invitation notification

    for sub_data in sub_tasks_data:
        SocialTask.objects.create(
            parent=root,
            initiator=initiator,
            title=sub_data['title'],
            description=sub_data.get('description', ''),
            duration_minutes=sub_data['duration_minutes'],
            scheduled_at=sub_data.get('scheduled_at'),
        )

    if not participant_ids:
        root.status = SocialTaskStatus.CONFIRMED
        root.save(update_fields=['status'])
        _create_all_personal_tasks(root)

    return root


def add_sub_task(root: SocialTask, data: dict) -> SocialTask:
    sub = SocialTask.objects.create(
        parent=root,
        initiator=root.initiator,
        title=data['title'],
        description=data.get('description', ''),
        duration_minutes=data['duration_minutes'],
        scheduled_at=data.get('scheduled_at'),
    )

    if root.status == SocialTaskStatus.CONFIRMED and sub.scheduled_at:
        for participant in root.participants.all():
            _create_personal_task(sub, participant)

    return sub


def accept_invite(root: SocialTask, user) -> SocialTaskParticipant:
    participant = root.participants.get(user=user, status=ParticipantStatus.INVITED)
    participant.status = ParticipantStatus.ACCEPTED
    participant.rsvp_at = tz.now()
    participant.save(update_fields=['status', 'rsvp_at'])
    _try_confirm(root)
    return participant


def decline_invite(root: SocialTask, user) -> SocialTaskParticipant:
    participant = root.participants.get(user=user, status=ParticipantStatus.INVITED)
    participant.status = ParticipantStatus.DECLINED
    participant.rsvp_at = tz.now()
    participant.save(update_fields=['status', 'rsvp_at'])
    # TODO: notify initiator that participant declined
    return participant


def cancel_social_task(root: SocialTask):
    node_ids = [root.id] + list(
        SocialTask.objects.filter(parent=root).values_list('id', flat=True)
    )
    task_ids = SocialTaskNodeTask.objects.filter(
        node_id__in=node_ids
    ).values_list('task_id', flat=True)
    TaskTemplate.objects.filter(id__in=task_ids).update(is_deleted=True)

    SocialTask.objects.filter(parent=root).update(is_deleted=True)
    root.status = SocialTaskStatus.CANCELLED
    root.is_deleted = True
    root.save(update_fields=['status', 'is_deleted'])
    # TODO: notify participants of cancellation


def update_node(node: SocialTask, validated_data: dict) -> SocialTask:
    old_scheduled_at = node.scheduled_at
    old_duration = node.duration_minutes

    for field, value in validated_data.items():
        setattr(node, field, value)
    node.save()

    root = node.root
    if root.status != SocialTaskStatus.CONFIRMED:
        return node

    new_scheduled_at = node.scheduled_at
    new_duration = node.duration_minutes
    scheduled_changed = new_scheduled_at != old_scheduled_at
    duration_changed = new_duration != old_duration

    if not scheduled_changed and not duration_changed:
        return node

    if old_scheduled_at is None and new_scheduled_at is not None:
        for participant in root.participants.all():
            _create_personal_task(node, participant)

    elif old_scheduled_at is not None and new_scheduled_at is None:
        task_ids = SocialTaskNodeTask.objects.filter(node=node).values_list('task_id', flat=True)
        TaskTemplate.objects.filter(id__in=task_ids).update(is_deleted=True)
        # TODO: notify participants of schedule removal

    elif old_scheduled_at is not None and new_scheduled_at is not None:
        update = {}
        if scheduled_changed:
            update['start_datetime'] = new_scheduled_at
        if duration_changed:
            update['duration_minutes'] = new_duration
        if update:
            task_ids = SocialTaskNodeTask.objects.filter(node=node).values_list('task_id', flat=True)
            TaskTemplate.objects.filter(id__in=task_ids).update(**update)
        # TODO: notify participants of reschedule

    return node
