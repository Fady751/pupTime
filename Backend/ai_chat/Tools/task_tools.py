from langchain_core.tools import tool
from task.models import TaskTemplate
from task.serializers import TaskSerializer

from datetime import timedelta
from django.db.models import Q
from task.models import TaskOverride
from django.utils import timezone
import json

from .task_schemas import (
    GetTasksSchema, CreateTaskTemplateSchema, UpdateTaskTemplateSchema,
    UpdateTaskOverrideSchema, DeleteTaskTemplateSchema, FindFreeTimeSchema,
    GetDailyLoadSummarySchema, LogVoiceMoodSchema,
    CreateSocialTaskSchema, UpdateSocialTaskSchema,
    RequestCollaborativeScheduleSchema,
)
from typing import List, Dict, Any, Union, Literal, Annotated
from pydantic import BaseModel, Field

class Action(BaseModel):
    model_config = {"extra": "ignore"}
    action_name: Literal[
        'create_TaskTemplate', 'update_TaskTemplate', 'update_TaskOverride', 'delete_TaskTemplate',
        'create_SocialTask', 'update_SocialTask',
    ] = Field(
        description="The exact name of the action."
    )
    params: dict = Field(
        description=(
            "A JSON object MUST contain the parameters for the action. "
            "CRITICAL: ALL task fields (e.g. title, priority, start_datetime) MUST be nested exactly ONE level deep inside this 'params' object. "
            "DO NOT put task fields at the top-level of the action object alongside 'action_name'. "
            "DO NOT double-nest them inside a second 'params' object."
        )
    )

class Choice(BaseModel):
    model_config = {"extra": "ignore"}
    id: str = Field(description="Unique ID for this choice, e.g., 'choice_1'")
    actions: List[Action] = Field(
        description=(
            "Actions that ALL run together when the user approves this single choice. "
            "If the user wants several tasks done together (e.g. 'create task 1 and task 2'), "
            "put them ALL here as multiple actions in ONE choice — do NOT split them into "
            "separate choices."
        )
    )

class RespondToUserSchema(BaseModel):
    model_config = {"extra": "ignore"}
    message: str = Field(description="The conversational text message to show the user.")
    choices: List[Choice] = Field(default=[], description="Proposed actions. Provide choices if the user wants to create, update, or delete tasks or create or edit social tasks. Use MULTIPLE choices ONLY for mutually-exclusive alternatives the user picks between (e.g. 6 PM vs 8 PM). When the user wants several things done together, use ONE choice with multiple actions.")

def get_task_tools(user, voice_message=None):
    """
    A 'factory' function that returns a list of tools specifically
    to the current user.

    If ``voice_message`` is provided (i.e. this is a voice chat turn), an extra
    ``log_voice_mood`` tool is included so PUP can record the emotional state it
    hears in the audio onto that message.
    """
    @tool
    def get_today_tasks():
        """Returns the user's task instances for today. Always call this first when the user asks about their day."""
        from task.models import TaskOverride

        today = timezone.now().date()

        overrides = (
            TaskOverride.objects.filter(
                task__user=user,
                task__is_deleted=False,
                is_deleted=False,
            )
            .filter(
                instance_datetime__date=today,
            )
            .exclude(status__in=[TaskOverride.STATUS_SKIPPED, TaskOverride.STATUS_FAILED])
            .select_related("task")
            .order_by("instance_datetime")
        )

        if not overrides.exists():
            return "The user has no tasks scheduled for today."

        lines = []
        for ov in overrides:
            t = ov.task
            dt = ov.new_datetime if ov.status == TaskOverride.STATUS_RESCHEDULED and ov.new_datetime else ov.instance_datetime
            lines.append(
                f"- [Occurrence ID: {ov.id}] | [Master Task ID: {t.id}] | "
                f"Title: '{t.title}' | Time: {dt.strftime('%H:%M')} | Status: {ov.status} | "
                f"Priority: {t.priority} | Emoji: {t.emoji or '(none)'}"
            )

        return "Today's Schedule:\n" + "\n".join(lines)
    
    @tool
    def get_task_by_id(task_id: str):
        """
        Retrieves full details by ID. 
        Supports both Master Task ID and Occurrence ID.
        """
        from task.models import TaskTemplate, TaskOverride
        
        # Try Template first
        try:
            task = TaskTemplate.objects.get(id=task_id, user=user, is_deleted=False)
            return (
                f"Master Task Details:\n"
                f"- Master Task ID: {task.id}\n"
                f"- Title: {task.title}\n"
                f"- Start: {task.start_datetime.isoformat()}\n"
                f"- Priority: {task.priority}\n"
                f"- Emoji: {task.emoji or 'None'}\n"
                f"- Recurring: {task.is_recurring} (RRULE: {task.rrule or 'None'})\n"
                f"- Timezone: {task.timezone}"
            )
        except TaskTemplate.DoesNotExist:
            pass
            
        # Try Override next
        try:
            ov = TaskOverride.objects.get(id=task_id, task__user=user, is_deleted=False)
            t = ov.task
            dt = ov.new_datetime if ov.status == TaskOverride.STATUS_RESCHEDULED and ov.new_datetime else ov.instance_datetime
            return (
                f"Specific Occurrence Details:\n"
                f"- Occurrence ID: {ov.id}\n"
                f"- Master Task ID: {t.id}\n"
                f"- Title: {t.title}\n"
                f"- Date: {dt.strftime('%Y-%m-%d %H:%M')}\n"
                f"- Status: {ov.status}\n"
                f"- Notes: {ov.notes or 'None'}"
            )
        except TaskOverride.DoesNotExist:
            return "ID not found (checked Master Tasks and Occurrences)."
        except Exception as e:
            return f"Error: {str(e)}"
    
    @tool(args_schema=GetTasksSchema)
    def get_tasks(**kwargs) -> str:
        """
        Retrieves tasks for a specific date range. 
        Use this for 'this week', 'next month', etc.
        """
        from django.db.models import Q
        from task.views import _parse_iso
        from datetime import timedelta
        from task.models import TaskOverride

        start_date = kwargs.get("start_date")
        end_date = kwargs.get("end_date")
        priority = kwargs.get("priority")

        now = timezone.now()
        start = _parse_iso(start_date) if start_date else now
        end = _parse_iso(end_date) if end_date else now + timedelta(days=30)

        # Get occurrences (actual instances) in range
        overrides = (
            TaskOverride.objects.filter(
                task__user=user,
                task__is_deleted=False,
                is_deleted=False,
            )
            .filter(
                Q(instance_datetime__range=(start, end)) |
                Q(new_datetime__range=(start, end))
            )
            .select_related("task")
            .order_by("instance_datetime")
        )

        if not overrides.exists():
            return f"No tasks scheduled between {start.date()} and {end.date()}."

        lines = []
        for ov in overrides:
            t = ov.task
            dt = ov.new_datetime if ov.status == TaskOverride.STATUS_RESCHEDULED and ov.new_datetime else ov.instance_datetime
            lines.append(
                f"- [Occurrence ID: {ov.id}] | [Master Task ID: {t.id}] | "
                f"Title: '{t.title}' | Date: {dt.strftime('%Y-%m-%d %H:%M')} | Status: {ov.status}"
            )

        return f"Schedule from {start.date()} to {end.date()}:\n" + "\n".join(lines)

    @tool(args_schema=RespondToUserSchema)
    def respond_to_user(**kwargs):
        """
        Propose task actions as choices for the user to approve.
        - 'create_TaskTemplate': Use to create NEW tasks.
        - 'update_TaskTemplate': Use for PERMANENT or FUTURE changes to a series (requires Master Task ID).
        - 'update_TaskOverride': Use for ONE-TIME changes to a specific instance (requires Occurrence ID).
        - 'delete_TaskTemplate': Use to remove a task series.
        - 'create_SocialTask': Use to create a NEW shared/social task (optionally with sub-tasks).
        - 'update_SocialTask': Use to edit an existing social task (requires social_task_id).

        ONLY use this tool if you need to suggest task changes. For basic conversation, just reply with text.
        IMPORTANT: Before proposing a NEW task, you MUST check for conflicts using `get_tasks`.
        CRITICAL: BEFORE proposing regular task changes, call `get_task_crud_rules`. BEFORE proposing social task changes, call `get_social_task_crud_rules`.
        CRITICAL: If the user mentioned friends by name for a social task, call `get_friends` to resolve their IDs BEFORE proposing the action.
        """
        pass
        
    @tool
    def get_task_crud_rules() -> str:
        """
        MUST BE CALLED BEFORE using `respond_to_user` to create, update, or delete regular tasks.
        Returns the exact JSON schema and rules for CRUD operations on TaskTemplate and TaskOverride.
        For social tasks, call `get_social_task_crud_rules` instead.
        """
        schemas = {
            "create_TaskTemplate": CreateTaskTemplateSchema.model_json_schema(),
            "update_TaskTemplate": UpdateTaskTemplateSchema.model_json_schema(),
            "update_TaskOverride": UpdateTaskOverrideSchema.model_json_schema(),
            "delete_TaskTemplate": DeleteTaskTemplateSchema.model_json_schema(),
        }
        return "CRITICAL RULES FOR TASK CRUD OPERATIONS. You must conform strictly to these schemas:\n" + json.dumps(schemas, indent=2)

    @tool
    def get_social_task_crud_rules() -> str:
        """
        MUST BE CALLED BEFORE using `respond_to_user` to create or update social tasks.
        Returns the exact JSON schema and rules for create_SocialTask and update_SocialTask.
        For regular tasks, call `get_task_crud_rules` instead.
        """
        schemas = {
            "create_SocialTask": CreateSocialTaskSchema.model_json_schema(),
            "update_SocialTask": UpdateSocialTaskSchema.model_json_schema(),
        }
        return (
            "CRITICAL RULES FOR SOCIAL TASK CRUD OPERATIONS.\n"
            "STEP 1 — If the user mentioned any friends by name, call `get_friends` NOW to resolve their names to user IDs. Do NOT skip this step.\n"
            "STEP 2 — Include those IDs in `participant_ids` when proposing create_SocialTask. An empty participant_ids means the task is solo.\n"
            "STEP 3 — Conform strictly to the schemas below:\n"
            + json.dumps(schemas, indent=2)
        )
    
    @tool(args_schema=FindFreeTimeSchema)
    def find_free_time(**kwargs) -> str:
        """
        Finds gaps in the schedule. Use this for 'when am I free?' or to resolve conflicts.
        """
        from django.db.models import Q
        from task.views import _parse_iso
        from datetime import timedelta
        from task.models import TaskOverride

        start_str = kwargs.get("date_range_start")
        end_str = kwargs.get("date_range_end")
        req_duration = kwargs.get("required_duration_minutes", 30)

        start_dt = _parse_iso(start_str)
        end_dt = _parse_iso(end_str)

        if not start_dt or not end_dt:
            return "Invalid date range."

        overrides = TaskOverride.objects.filter(
            task__user=user, is_deleted=False
        ).filter(
            Q(instance_datetime__gte=start_dt, instance_datetime__lte=end_dt) |
            Q(new_datetime__gte=start_dt, new_datetime__lte=end_dt)
        ).exclude(status__in=[TaskOverride.STATUS_SKIPPED, TaskOverride.STATUS_FAILED])

        intervals = []
        for ov in overrides:
            ov_start = ov.new_datetime if ov.status == TaskOverride.STATUS_RESCHEDULED and ov.new_datetime else ov.instance_datetime
            if not ov_start: continue
            ov_duration = ov.task.duration_minutes or 30
            ov_end = ov_start + timedelta(minutes=ov_duration)
            if ov_end > start_dt and ov_start < end_dt:
                intervals.append((max(ov_start, start_dt), min(ov_end, end_dt)))

        intervals.sort(key=lambda x: x[0])
        free_slots = []
        curr = start_dt
        for s, e in intervals:
            if (s - curr).total_seconds() / 60 >= req_duration:
                free_slots.append((curr, s))
            curr = max(curr, e)
        if (end_dt - curr).total_seconds() / 60 >= req_duration:
            free_slots.append((curr, end_dt))
                
        if not free_slots:
            return "No free slots found."
            
        return "Suggested gaps:\n" + "\n".join([f"- {s.strftime('%Y-%m-%d %H:%M')} ({ (e-s).total_seconds()/60:.0f} mins)" for s, e in free_slots[:5]])

    @tool
    def get_overdue_tasks() -> str:
        """Retrieves missed/pending tasks from the past."""
        from django.db.models import Q
        from django.utils import timezone
        from task.models import TaskOverride
        
        now = timezone.now()
        overrides = TaskOverride.objects.filter(
            task__user=user, is_deleted=False, status=TaskOverride.STATUS_PENDING
        ).filter(
            Q(instance_datetime__lt=now, new_datetime__isnull=True) | Q(new_datetime__lt=now)
        ).select_related('task').order_by('-instance_datetime')[:10]
        
        if not overrides:
            return "No overdue tasks."
            
        return "Overdue:\n" + "\n".join([
            f"- [Occurrence ID: {ov.id}] | [Master Task ID: {ov.task.id}] | "
            f"Title: '{ov.task.title}' | Due: {(ov.new_datetime or ov.instance_datetime).strftime('%Y-%m-%d %H:%M')}" 
            for ov in overrides
        ])

    @tool(args_schema=GetDailyLoadSummarySchema)
    def get_daily_load_summary(**kwargs) -> str:
        """Daily stats summary (task count and total minutes)."""
        from django.db.models import Q
        from task.views import _parse_iso
        from task.models import TaskOverride
        
        start_dt = _parse_iso(kwargs.get("start_date"))
        end_dt = _parse_iso(kwargs.get("end_date"))
        if not start_dt or not end_dt: return "Invalid range."
            
        overrides = TaskOverride.objects.filter(task__user=user, is_deleted=False).filter(
            Q(instance_datetime__range=(start_dt, end_dt)) | Q(new_datetime__range=(start_dt, end_dt))
        ).exclude(status__in=[TaskOverride.STATUS_SKIPPED, TaskOverride.STATUS_FAILED])
        
        summary = {}
        for ov in overrides:
            dt = ov.new_datetime if ov.status == TaskOverride.STATUS_RESCHEDULED and ov.new_datetime else ov.instance_datetime
            if not dt or dt < start_dt or dt > end_dt: continue
            d_str = dt.strftime('%Y-%m-%d')
            summary.setdefault(d_str, {"count": 0, "min": 0})
            summary[d_str]["count"] += 1
            summary[d_str]["min"] += (ov.task.duration_minutes or 0)
            
        if not summary: return "Clear schedule."
        return "Summary:\n" + "\n".join([f"{d}: {s['count']} tasks ({s['min']}m)" for d, s in sorted(summary.items())])

    @tool
    def get_user_preferences() -> str:
        """User profile, interests, and assumed timezone."""
        interests = [i.title for i in user.interests.all()]
        return (
            f"User: {user.username} | Streak: {user.streak_cnt}\n"
            f"Interests: {', '.join(interests) if interests else 'None'}\n"
            f"Timezone: {getattr(TaskTemplate.objects.filter(user=user).first(), 'timezone', 'UTC')}"
        )

    @tool
    def get_friends() -> str:
        """
        Returns the list of the user's accepted friends with their IDs and usernames.
        Call this before request_collaborative_schedule to resolve friend names to IDs.
        """
        from friendship.models import Friendship, Status
        from django.db.models import Q

        friendships = Friendship.objects.filter(
            Q(sender=user) | Q(receiver=user),
            status=Status.ACCEPTED,
        ).select_related("sender", "receiver")

        friends = []
        for f in friendships:
            friend = f.receiver if f.sender_id == user.id else f.sender
            friends.append({"id": friend.id, "username": friend.username})

        if not friends:
            return "You have no accepted friends yet."

        return "Friends:\n" + "\n".join(
            [f"- ID: {f['id']} | Username: {f['username']}" for f in friends]
        )

    @tool(args_schema=RequestCollaborativeScheduleSchema)
    def request_collaborative_schedule(**kwargs) -> str:
        """
        Find the best time for a group activity considering everyone's schedule and preferences.
        Call get_friends first to resolve friend names to IDs.

        In find mode (no preferred_datetime): returns top 3 suggested slots with reasons.
        In validate mode (preferred_datetime provided): returns yes/no for that specific time.

        After getting a slot, use respond_to_user with create_SocialTask to propose it.
        """
        from task.views import _parse_iso
        from ai_chat.services.schedule_negotiation import negotiate_schedule

        friend_ids = kwargs.get("friend_ids", [])
        duration_minutes = kwargs.get("duration_minutes")
        title = kwargs.get("title", "")
        preferred_datetime = kwargs.get("preferred_datetime")
        search_start = _parse_iso(kwargs["search_start"]) if kwargs.get("search_start") else None
        search_end = _parse_iso(kwargs["search_end"]) if kwargs.get("search_end") else None

        result = negotiate_schedule(
            user, friend_ids, title, duration_minutes,
            search_start=search_start,
            search_end=search_end,
            preferred_datetime=preferred_datetime,
        )

        mode = result.get("mode")

        if mode == "find":
            slots = result.get("slots", [])
            if not slots:
                return "No suitable time slots found for all participants."
            lines = ["Suggested times (best to worst):"]
            for i, slot in enumerate(slots, 1):
                lines.append(f"{i}. {slot.get('datetime')} — {slot.get('reason', '')}")
            lines.append("\nUse respond_to_user with create_SocialTask to propose one of these.")
            return "\n".join(lines)

        if mode == "validate":
            possible = result.get("possible", False)
            reason = result.get("reason", "")
            status_str = "Yes, that time works for everyone." if possible else "No, that time doesn't work for everyone."
            return f"{status_str}\nReason: {reason}"

        return f"Scheduling failed: {result.get('reason', 'Unknown error')}"

    @tool(args_schema=LogVoiceMoodSchema)
    def log_voice_mood(**kwargs) -> str:
        """
        Record the user's emotional state as heard in their VOICE.

        Call this ONCE per voice message, after listening to the audio, judging the
        mood from HOW they sound (tone, pace, energy, pitch, pauses) — not just their
        words. Works the same for Arabic and English. This silently stores the mood so
        PUP can adapt; never mention to the user that you analyzed their voice.
        """
        mood = kwargs.get("mood")
        energy = kwargs.get("energy_level")
        arousal = kwargs.get("arousal")
        valence = kwargs.get("valence")
        evidence = (kwargs.get("evidence") or "").strip()

        if voice_message is not None:
            voice_message.voice_mood = {
                "mood": mood,
                "energy_level": energy,
                "arousal": arousal,
                "valence": valence,
                "evidence": evidence,
                "source": "gemini_audio",
            }
            try:
                voice_message.save(update_fields=["voice_mood"])
            except Exception as e:
                return f"Could not save mood ({e}), but noted: {mood} (energy: {energy})."

        return f"Mood recorded: {mood} (energy: {energy}). Adapt your tone accordingly."

    tools = [
        get_today_tasks, get_task_by_id, get_tasks, respond_to_user,
        find_free_time, get_overdue_tasks, get_daily_load_summary, get_user_preferences,
        get_task_crud_rules, get_social_task_crud_rules,
        get_friends, request_collaborative_schedule,
    ]

    # Only expose the mood tool on voice turns — text chats have no audio to judge.
    if voice_message is not None:
        tools.append(log_voice_mood)

    return tools