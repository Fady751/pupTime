from langchain_core.tools import tool
from task.models import TaskTemplate
from task.serializers import TaskSerializer

from django.utils import timezone
import json

from .task_schemas import (
    GetTasksSchema, CreateTaskTemplateSchema, UpdateTaskTemplateSchema,
    UpdateTaskOverrideSchema, DeleteTaskTemplateSchema, FindFreeTimeSchema,
    GetDailyLoadSummarySchema
)
from typing import List, Dict, Any, Union, Literal, Annotated
from pydantic import BaseModel, Field

class Action(BaseModel):
    model_config = {"extra": "ignore"}
    action_name: Literal['create_TaskTemplate', 'update_TaskTemplate', 'update_TaskOverride', 'delete_TaskTemplate'] = Field(
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
    actions: List[Action] = Field(description="List of actions to execute if this choice is selected")

class RespondToUserSchema(BaseModel):
    model_config = {"extra": "ignore"}
    message: str = Field(description="The conversational text message to show the user.")
    choices: List[Choice] = Field(default=[], description="Proposed actions. Provide choices if the user wants to create, update, or delete tasks.")

def get_task_tools(user):
    """
    A 'factory' function that returns a list of tools specifically 
    to the current user
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
        
        ONLY use this tool if you need to suggest task changes. For basic conversation, just reply with text.
        IMPORTANT: Before proposing a NEW task, you MUST check for conflicts using `get_tasks`.
        CRITICAL: BEFORE using this tool to create, update, or delete tasks, you MUST call `get_task_crud_rules` to understand the required fields and constraints.
        """
        pass
        
    @tool
    def get_task_crud_rules() -> str:
        """
        MUST BE CALLED BEFORE using `respond_to_user` to create, update, or delete tasks.
        Returns the exact JSON schema and rules for CRUD operations on tasks.
        """
        schemas = {
            "create_TaskTemplate": CreateTaskTemplateSchema.model_json_schema(),
            "update_TaskTemplate": UpdateTaskTemplateSchema.model_json_schema(),
            "update_TaskOverride": UpdateTaskOverrideSchema.model_json_schema(),
            "delete_TaskTemplate": DeleteTaskTemplateSchema.model_json_schema(),
        }
        
        return "CRITICAL RULES FOR TASK CRUD OPERATIONS. You must conform strictly to these schemas:\n" + json.dumps(schemas, indent=2)
    
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

    return [
        get_today_tasks, get_task_by_id, get_tasks, respond_to_user,
        find_free_time, get_overdue_tasks, get_daily_load_summary, get_user_preferences,
        get_task_crud_rules
    ]