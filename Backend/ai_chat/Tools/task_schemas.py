from pydantic import BaseModel, Field
from typing import Optional, Literal


PriorityType = Literal["none", "low", "medium", "high"]


class CreateTaskSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """
    Schema for creating a new task.
    Maps to the writable fields in TaskSerializer (excluding user, id, overrides).
    """

    title: str = Field(
        description="The title or name of the task the user wants to create."
    )
    start_datetime: str = Field(
        description=(
            "The start date and time in ISO 8601 format (e.g. '2026-03-12T10:00:00Z'). "
            "If the user says 'tomorrow at 9am', calculate the exact datetime before passing it here."
        )
    )
    priority: Optional[PriorityType] = Field(
        default="none",
        description="Task priority. Must be exactly 'none', 'low', 'medium', or 'high'."
    )
    emoji: Optional[str] = Field(
        default="",
        description="A single emoji that represents the task (e.g. '🏋️'). Leave empty if the user didn't mention one."
    )
    reminder_time: Optional[int] = Field(
        default=None,
        description="Number of minutes before the task starts to send a reminder. Null if no reminder."
    )
    duration_minutes: Optional[int] = Field(
        default=None,
        description="How long the task takes in minutes. Null if not specified."
    )
    is_recurring: bool = Field(
        default=False,
        description="Set to true only if the user explicitly says the task repeats (e.g. 'every day', 'every Monday')."
    )
    rrule: Optional[str] = Field(
        default=None,
        description=(
            "The recurrence rule in RRULE format. Required only when is_recurring is true. "
            "Example: 'FREQ=DAILY' for every day, 'FREQ=WEEKLY;BYDAY=MO' for every Monday."
        )
    )
    timezone: Optional[str] = Field(
        default="UTC",
        description="IANA timezone name (e.g. 'Africa/Cairo', 'America/New_York'). Defaults to UTC."
    )

class UpdateTaskSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """
    Schema for partially updating an existing task (PATCH).
    All fields are optional — only pass the ones the user wants to change.
    task_id is required to identify which task to update.
    make 
    """

    task_id: str = Field(
        description="The unique UUID of the task to update."
    )
    title: Optional[str] = Field(
        default=None,
        description="New task title, if the user wants to rename it."
    )
    start_datetime: Optional[str] = Field(
        default=None,
        description="New start date/time in ISO 8601 format, if the user wants to reschedule."
    )
    priority: Optional[PriorityType] = Field(
        default=None,
        description="New priority. Must be exactly 'none', 'low', 'medium', or 'high'."
    )
    emoji: Optional[str] = Field(
        default=None,
        description="New emoji for the task."
    )
    reminder_time: Optional[int] = Field(
        default=None,
        description="New reminder time in minutes before the task."
    )
    duration_minutes: Optional[int] = Field(
        default=None,
        description="New duration in minutes."
    )
    is_recurring: Optional[bool] = Field(
        default=None,
        description="Change whether the task repeats."
    )
    rrule: Optional[str] = Field(
        default=None,
        description="New RRULE recurrence rule (required if is_recurring is being set to true)."
    )
    timezone: Optional[str] = Field(
        default=None,
        description="New IANA timezone name."
    )


class DeleteTaskSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """Schema for soft-deleting a task."""

    task_id: str = Field(
        description="The unique UUID of the task to delete."
    )


class GetTasksSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """Schema for retrieving the user's tasks within a date range."""

    start_date: Optional[str] = Field(
        default=None,
        description="ISO 8601 start of the date range to fetch tasks for (e.g. '2026-03-11T00:00:00Z')."
    )
    end_date: Optional[str] = Field(
        default=None,
        description="ISO 8601 end of the date range to fetch tasks for (e.g. '2026-03-18T23:59:59Z')."
    )
    priority: Optional[PriorityType] = Field(
        default=None,
        description="Filter tasks by priority. Omit to return all priorities."
    )

class UpdateInstanceSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """Schema for rescheduling or updating a specific task occurrence (instance)."""

    instance_id: str = Field(description="The UUID of the specific task instance (INSTANCE_ID).")
    status: Optional[str] = Field(
        default="RESCHEDULED",
        description="New status: PENDING, COMPLETED, SKIPPED, RESCHEDULED, FAILED."
    )
    new_datetime: Optional[str] = Field(
        description="The new ISO 8601 timestamp (required if status is 'RESCHEDULED')."
    )
    notes: Optional[str] = Field(description="Optional notes for this specific instance.")


class FindFreeTimeSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """Schema for finding free time slots in the user's schedule."""

    date_range_start: str = Field(
        description="ISO 8601 start of the date range to search for free time."
    )
    date_range_end: str = Field(
        description="ISO 8601 end of the date range to search for free time."
    )
    required_duration_minutes: int = Field(
        description="How much consecutive free time (in minutes) is needed."
    )


class GetDailyLoadSummarySchema(BaseModel):
    model_config = {"extra": "ignore"}
    """Schema for getting a summary of the user's task load over a date range."""

    start_date: str = Field(
        description="ISO 8601 start date of the summary range."
    )
    end_date: str = Field(
        description="ISO 8601 end date of the summary range."
    )