from langchain_core.tools import tool
from task.models import TaskTemplate
from task.serializers import TaskSerializer

from django.utils import timezone
import json

from .task_schemas import (
    GetTasksSchema, CreateTaskSchema, CheckScheduleConflictSchema, 
    FindFreeTimeSchema, GetDailyLoadSummarySchema
)
from typing import List, Dict, Any
from pydantic import BaseModel, Field

class Action(BaseModel):
    action_name: str = Field(description="Action name. Must be 'create_task', 'update_task', or 'delete_task'")
    params: dict = Field(
        description="A JSON object containing the parameters for the action. MUST be a valid JSON object, NOT a string.",
        json_schema_extra={
            "example": {
                "title": "Example Task",
                "start_datetime": "2026-03-12T15:00:00Z",
                "priority": "high"
            }
        }
    )

class Choice(BaseModel):
    id: str = Field(description="Unique ID for this choice, e.g., 'choice_1'")
    actions: List[Action] = Field(description="List of actions to execute if this choice is selected")

class RespondToUserSchema(BaseModel):
    message: str = Field(description="The conversational text message to show the user.")
    choices: List[Choice] = Field(default=[], description="Proposed actions. Provide choices if the user wants to create, update, or delete tasks.")

def get_task_tools(user):
    """
    A 'factory' function that returns a list of tools specifically 
    to the current user
    """
    @tool
    def get_today_tasks():
        """Returns the user's tasks for today, including recurring tasks. Always call this first when the user asks about their day."""
        from django.db.models import Q
        today = timezone.now().date()

        tasks = TaskTemplate.objects.filter(
            user=user,
            is_deleted=False,
        ).filter(
            Q(start_datetime__date=today)  
            | Q(is_recurring=True)          
        )

        if not tasks.exists():
            return "The user has no tasks for today."

        lines = []
        for task in tasks:
            lines.append(
                f"- ID: {task.id} | Title: '{task.title}' | "
                f"Start: {task.start_datetime.isoformat()} | "
                f"Priority: {task.priority} | Emoji: {task.emoji or '(none)'} | "
                f"Duration: {task.duration_minutes or 'N/A'} min | "
                f"Recurring: {task.is_recurring} | Timezone: {task.timezone}"
            )

        return "Today's tasks:\n" + "\n".join(lines)
    
    @tool
    def get_task_by_id(task_id: str ):
        """
        Retrieves the full details of a single task including all its overrides.
        Use this when the user asks about a specific task and you already have its ID
        (e.g. from a previous call to get_today_tasks or get_tasks).
        Do NOT call this to browse tasks — use get_today_tasks or get_tasks for that.
        """
        try:
            task = TaskTemplate.objects.get(id=task_id, user=user, is_deleted=False)
            return json.dumps(TaskSerializer(task).data, default=str)
        except TaskTemplate.DoesNotExist:
            return "Task not found."
    
    @tool(args_schema=GetTasksSchema)
    def get_tasks(**kwargs) -> str:
        """
        Retrieves the user's tasks with optional date range and priority filters.
        Use this when the user asks about tasks in a specific period (e.g. 'this week', 'next month').
        For today's tasks, prefer get_today_tasks instead.
        Always returns task IDs so you can reference them in update or delete calls.
        """
        from django.db.models import Q
        from task.views import _parse_iso
        from datetime import timedelta

        start_date = kwargs.get("start_date")
        end_date = kwargs.get("end_date")
        priority = kwargs.get("priority")

        now = timezone.now()

        start = _parse_iso(start_date) if start_date else now
        end = _parse_iso(end_date) if end_date else now + timedelta(days=60)

        qs = TaskTemplate.objects.filter(user=user, is_deleted=False).filter(
            Q(start_datetime__gte=start, start_datetime__lte=end)
            | Q(is_recurring=True)
        ).distinct()


        if priority:
            qs = qs.filter(priority=priority)

        qs = qs.order_by("-start_datetime")[:50]

        if not qs:
            return "No tasks found matching the requested filters."

        lines = []
        for task in qs:
            lines.append(
                f"- ID: {task.id} | Title: '{task.title}' | "
                f"Start: {task.start_datetime.isoformat()} | "
                f"Priority: {task.priority} | Emoji: {task.emoji or '(none)'} | "
                f"Duration: {task.duration_minutes or 'N/A'} min | "
                f"Recurring: {task.is_recurring} | Timezone: {task.timezone}"
            )

        return "Tasks:\n" + "\n".join(lines)

    @tool(args_schema=RespondToUserSchema)
    def respond_to_user(**kwargs):
        """
        ALWAYS use this tool to send your final response to the user.
        If the user wants to create, update, or delete tasks, propose them as choices.
        Do NOT use this tool to ask questions; use it to provide your final answer or propose actions.
        """
        pass
    
    @tool(args_schema=CheckScheduleConflictSchema)
    def check_schedule_conflict(**kwargs) -> str:
        """
        Checks if a proposed task time conflicts with the user's existing tasks.
        Use this before proposing a specific time to the user to avoid double-booking.
        """
        from task.views import _parse_iso
        from datetime import timedelta
        from task.models import TaskOverride

        start_time_str = kwargs.get("start_datetime")
        duration = kwargs.get("duration_minutes")
        if duration is None or duration <= 0:
            duration = 30
        
        start_dt = _parse_iso(start_time_str)
        if not start_dt:
            return "Invalid start_datetime format."
            
        end_dt = start_dt + timedelta(minutes=duration)
        
        overrides = TaskOverride.objects.filter(
            task__user=user, 
            is_deleted=False
        ).exclude(
            status__in=[TaskOverride.STATUS_SKIPPED, TaskOverride.STATUS_FAILED]
        ).select_related('task')
        
        conflicts = []
        for ov in overrides:
            ov_start = ov.new_datetime if ov.status == TaskOverride.STATUS_RESCHEDULED and ov.new_datetime else ov.instance_datetime
            if not ov_start:
                continue
                
            ov_duration = ov.task.duration_minutes
            if ov_duration is None or ov_duration <= 0:
                ov_duration = 30
            ov_end = ov_start + timedelta(minutes=ov_duration)
            
            # Check overlap: Max(start1, start2) < Min(end1, end2)
            if max(start_dt, ov_start) < min(end_dt, ov_end):
                conflicts.append(f"- '{ov.task.title}' ({ov_start.strftime('%H:%M')} to {ov_end.strftime('%H:%M')})")
                
        if conflicts:
            return "Conflicts found:\n" + "\n".join(conflicts)
        return "No conflicts! The time slot is free."


    @tool(args_schema=FindFreeTimeSchema)
    def find_free_time(**kwargs) -> str:
        """
        Finds gaps of free time in the user's schedule over a given date range.
        Use this when the user asks 'when do I have time to do X?'.
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
            return "Invalid date range format."

        overrides = TaskOverride.objects.filter(
            task__user=user, 
            is_deleted=False
        ).filter(
            Q(instance_datetime__gte=start_dt - timedelta(days=1), instance_datetime__lte=end_dt + timedelta(days=1)) |
            Q(new_datetime__gte=start_dt - timedelta(days=1), new_datetime__lte=end_dt + timedelta(days=1))
        ).exclude(
            status__in=[TaskOverride.STATUS_SKIPPED, TaskOverride.STATUS_FAILED]
        ).select_related('task')

        intervals = []
        for ov in overrides:
            ov_start = ov.new_datetime if ov.status == TaskOverride.STATUS_RESCHEDULED and ov.new_datetime else ov.instance_datetime
            if not ov_start: continue
            ov_duration = ov.task.duration_minutes
            if ov_duration is None or ov_duration <= 0:
                ov_duration = 30
            ov_end = ov_start + timedelta(minutes=ov_duration)
            
            # clamp to range
            if ov_end > start_dt and ov_start < end_dt:
                intervals.append((max(ov_start, start_dt), min(ov_end, end_dt)))

        intervals.sort(key=lambda x: x[0])
        
        merged = []
        for curr in intervals:
            if not merged:
                merged.append(curr)
            else:
                prev = merged[-1]
                if curr[0] <= prev[1]: # overlap
                    merged[-1] = (prev[0], max(prev[1], curr[1]))
                else:
                    merged.append(curr)

        free_slots = []
        current_time = start_dt
        for busy_start, busy_end in merged:
            if current_time < busy_start:
                gap = (busy_start - current_time).total_seconds() / 60
                if gap >= req_duration:
                    free_slots.append((current_time, busy_start))
            current_time = max(current_time, busy_end)
            
        if current_time < end_dt:
            gap = (end_dt - current_time).total_seconds() / 60
            if gap >= req_duration:
                free_slots.append((current_time, end_dt))
                
        if not free_slots:
            return f"No free time slots of at least {req_duration} minutes found in this range."
            
        lines = []
        for s, e in free_slots[:5]: # Return top 5 slots
            lines.append(f"- {s.strftime('%Y-%m-%d %H:%M')} to {e.strftime('%Y-%m-%d %H:%M')} ({(e-s).total_seconds()/60:.0f} mins)")
        return "Suggested free time slots:\n" + "\n".join(lines)


    @tool
    def get_overdue_tasks() -> str:
        """
        Retrieves tasks that are in the past but still marked as PENDING.
        Use this to proactively remind the user about things they might have missed.
        """
        from django.db.models import Q
        from django.utils import timezone
        from task.models import TaskOverride
        
        now = timezone.now()
        
        overrides = TaskOverride.objects.filter(
            task__user=user,
            is_deleted=False,
            status=TaskOverride.STATUS_PENDING
        ).filter(
            Q(instance_datetime__lt=now, new_datetime__isnull=True) |
            Q(new_datetime__lt=now)
        ).select_related('task').order_by('-instance_datetime')[:20]
        
        if not overrides:
            return "No overdue tasks found."
            
        lines = []
        for ov in overrides:
            dt = ov.new_datetime if ov.new_datetime else ov.instance_datetime
            lines.append(f"- ID: {ov.task.id} | OverrideID: {ov.id} | Title: '{ov.task.title}' | Was Due: {dt.strftime('%Y-%m-%d %H:%M')}")
            
        return "Overdue Tasks:\n" + "\n".join(lines)


    @tool(args_schema=GetDailyLoadSummarySchema)
    def get_daily_load_summary(**kwargs) -> str:
        """
        Gets an aggregated summary of the user's workload (number of tasks and total duration) per day.
        Use this to quickly assess how busy a user is over a week or month.
        """
        from django.db.models import Q
        from task.views import _parse_iso
        from task.models import TaskOverride
        from datetime import timedelta
        
        start_str = kwargs.get("start_date")
        end_str = kwargs.get("end_date")
        
        start_dt = _parse_iso(start_str)
        end_dt = _parse_iso(end_str)
        
        if not start_dt or not end_dt:
            return "Invalid date range format."
            
        overrides = TaskOverride.objects.filter(
            task__user=user,
            is_deleted=False
        ).filter(
            Q(instance_datetime__gte=start_dt, instance_datetime__lte=end_dt) |
            Q(new_datetime__gte=start_dt, new_datetime__lte=end_dt)
        ).exclude(
            status__in=[TaskOverride.STATUS_SKIPPED, TaskOverride.STATUS_FAILED]
        ).select_related('task')
        
        summary = {}
        for ov in overrides:
            dt = ov.new_datetime if ov.status == TaskOverride.STATUS_RESCHEDULED and ov.new_datetime else ov.instance_datetime
            if not dt or dt < start_dt or dt > end_dt:
                continue
                
            date_str = dt.strftime('%Y-%m-%d (%A)')
            if date_str not in summary:
                summary[date_str] = {"count": 0, "duration": 0}
                
            summary[date_str]["count"] += 1
            summary[date_str]["duration"] += (ov.task.duration_minutes or 0)
            
        if not summary:
            return "No tasks scheduled in this period."
            
        lines = []
        for date_str in sorted(summary.keys()):
            stats = summary[date_str]
            lines.append(f"{date_str}: {stats['count']} tasks, {stats['duration']} minutes total.")
            
        return "Daily Load Summary:\n" + "\n".join(lines)


    @tool
    def get_user_preferences() -> str:
        """
        Retrieves the user's preferences, interests, timezone, and general profile info.
        Use this to tailor task suggestions (e.g., aligning tasks with their interests).
        """
        lines = []
        lines.append(f"Username: {user.username}")
        if user.birth_day:
            lines.append(f"Birthday: {user.birth_day}")
        if user.gender:
            lines.append(f"Gender: {user.gender}")
        lines.append(f"Current Streak: {user.streak_cnt}")
        
        interests = [interest.title for interest in user.interests.all()]
        if interests:
            lines.append(f"Interests: {', '.join(interests)}")
        else:
            lines.append("Interests: Not specified")
            
        from task.models import TaskTemplate
        recent_task = TaskTemplate.objects.filter(user=user, is_deleted=False).order_by('-created_at').first()
        if recent_task:
            lines.append(f"Assumed Timezone: {recent_task.timezone}")
        else:
            lines.append("Assumed Timezone: UTC")
            
        return "User Profile & Preferences:\n" + "\n".join(lines)

    return [
        get_today_tasks, get_task_by_id, get_tasks, respond_to_user,
        check_schedule_conflict, find_free_time, get_overdue_tasks, 
        get_daily_load_summary, get_user_preferences
    ]