from langchain_core.tools import tool
from task.models import TaskTemplate
from task.serializers import TaskSerializer

from django.utils import timezone

from .task_schemas import GetTasksSchema, CreateTaskSchema 

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
    return [get_today_tasks] 