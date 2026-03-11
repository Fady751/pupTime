from langchain_core.tools import tool
from task.models import TaskTemplate
from task.serializers import TaskSerializer

from django.utils import timezone
import json

from .task_schemas import GetTasksSchema, CreateTaskSchema 
from typing import List, Dict, Any
from pydantic import BaseModel, Field

class Action(BaseModel):
    action_name: str = Field(description="Action name. Must be 'create_task', 'update_task', or 'delete_task'")
    params: dict = Field(description="A JSON object containing the parameters for the action. DO NOT stringify this object.")

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
                f"Priority: {task.priority} | Recurring: {task.is_recurring}"
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
                f"Priority: {task.priority} | Recurring: {task.is_recurring}"
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
    
    return [get_today_tasks, get_task_by_id, get_tasks, respond_to_user]