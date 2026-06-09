import json
import re
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from ..ai.provider import ChatMessage, get_ai_provider
from ..models import UserMemory


def _load_participant_data(user, search_start, search_end):
    from task.models import TaskOverride

    overrides = (
        TaskOverride.objects.filter(
            task__user=user,
            task__is_deleted=False,
            is_deleted=False,
        )
        .filter(
            Q(instance_datetime__range=(search_start, search_end)) |
            Q(new_datetime__range=(search_start, search_end))
        )
        .exclude(status__in=[TaskOverride.STATUS_SKIPPED, TaskOverride.STATUS_FAILED])
        .select_related("task")
        .order_by("instance_datetime")
    )

    schedule = []
    for ov in overrides:
        dt = (
            ov.new_datetime
            if ov.status == TaskOverride.STATUS_RESCHEDULED and ov.new_datetime
            else ov.instance_datetime
        )
        if dt:
            duration = ov.task.duration_minutes or 30
            schedule.append(
                f"- {dt.strftime('%Y-%m-%d %H:%M')} for {duration}min: {ov.task.title}"
            )

    memories = UserMemory.objects.filter(user=user).order_by("-importance_score")[:20]
    preferences = [f"- [{m.category}] {m.fact_content}" for m in memories]

    return {"username": user.username, "schedule": schedule, "preferences": preferences}


def _build_prompt(
    participants_data, title, duration_minutes, search_start, search_end, preferred_datetime
):
    lines = [
        "You are a scheduling assistant. Analyze schedules and preferences to find the best meeting time.",
        f"Activity: {title}",
        f"Duration needed: {duration_minutes} minutes of consecutive free time",
        f"Search window: {search_start.strftime('%Y-%m-%d %H:%M')} to {search_end.strftime('%Y-%m-%d %H:%M')} UTC",
        "",
    ]

    for p in participants_data:
        lines.append(f"## Participant: {p['username']}")
        lines.append("Busy blocks:")
        lines.extend(p["schedule"] if p["schedule"] else ["- (no tasks scheduled)"])
        lines.append("Habits and preferences:")
        lines.extend(p["preferences"] if p["preferences"] else ["- (none on record)"])
        lines.append("")

    if preferred_datetime:
        lines += [
            f"Question: Is {preferred_datetime} a good time for this activity?",
            "Consider whether all participants are free for the full duration and whether it fits their preferences.",
            "",
            'Respond with ONLY valid JSON: {"mode": "validate", "possible": true, "reason": "..."}',
        ]
    else:
        lines += [
            "Find the top 3 best times when ALL participants are free for the required duration.",
            "Rank by: everyone free + respects preferences + good energy time.",
            "",
            "Respond with ONLY valid JSON:",
            '{"mode": "find", "slots": [',
            '  {"datetime": "YYYY-MM-DDTHH:MM:SSZ", "reason": "short reason"},',
            '  {"datetime": "YYYY-MM-DDTHH:MM:SSZ", "reason": "short reason"},',
            '  {"datetime": "YYYY-MM-DDTHH:MM:SSZ", "reason": "short reason"}',
            "]}",
        ]

    return "\n".join(lines)


def _parse_negotiation_response(raw: str) -> dict:
    clean = re.sub(r"```(?:json)?\n?", "", raw).strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", clean, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {"mode": "error", "reason": "Could not parse scheduling response."}


def negotiate_schedule(
    initiator,
    friend_ids,
    title,
    duration_minutes,
    search_start=None,
    search_end=None,
    preferred_datetime=None,
):
    from user.models import User
    from friendship.models import Friendship, Status

    now = timezone.now()
    if search_start is None:
        search_start = now
    if search_end is None:
        search_end = now + timedelta(days=7)

    friendships = Friendship.objects.filter(
        Q(sender=initiator) | Q(receiver=initiator),
        status=Status.ACCEPTED,
    )
    valid_friend_ids = set()
    for f in friendships:
        other_id = f.receiver_id if f.sender_id == initiator.id else f.sender_id
        valid_friend_ids.add(other_id)

    friend_users = User.objects.filter(
        id__in=[fid for fid in friend_ids if fid in valid_friend_ids]
    )

    participants_data = [_load_participant_data(initiator, search_start, search_end)]
    for friend in friend_users:
        participants_data.append(_load_participant_data(friend, search_start, search_end))

    prompt = _build_prompt(
        participants_data, title, duration_minutes, search_start, search_end, preferred_datetime
    )

    provider = get_ai_provider()
    raw = provider.generate([ChatMessage(role="user", content=prompt)])
    return _parse_negotiation_response(raw)
