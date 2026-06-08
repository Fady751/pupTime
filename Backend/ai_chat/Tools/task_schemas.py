from pydantic import BaseModel, Field
from typing import Optional, Literal, List


PriorityType = Literal["none", "low", "medium", "high"]


class CreateTaskTemplateSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """
    Schema for creating a new TaskTemplate.
    Maps to the writable fields in TaskTemplate.
    """
    title: str = Field(
        description="The title or name of the task the user wants to create."
    )
    start_datetime: str = Field(
        description=(
            "The start date and time in ISO 8601 format (e.g. '2026-03-12T10:00:00Z'). "
            "REQUIRED for new tasks. If the user says 'tomorrow at 9am', calculate the exact datetime before passing it here."
        )
    )
    priority: PriorityType = Field(
        description="Task priority. MUST be exactly 'none', 'low', 'medium', or 'high'. YOU MUST choose the one you think is best (don't just default to 'none')."
    )
    emoji: str = Field(
        description="A single emoji that represents the task (e.g. '🏋️'). YOU MUST choose an appropriate one."
    )
    reminder_time: Optional[int] = Field(
        default=None,
        description="Number of minutes before the task starts to send a reminder. Null if no reminder."
    )
    duration_minutes: Optional[int] = Field(
        default=None,
        description="How long the task takes in minutes. YOU SHOULD suggest a reasonable duration if the user didn't specify one."
    )
    is_recurring: bool = Field(
        default=False,
        description="Set to true only if the user explicitly says the task repeats (e.g. 'every day', 'every Monday')."
    )
    rrule: str = Field(
        default=None,
        description=(
            "The recurrence rule in RRULE format. Required only when is_recurring is true. "
            "Example: 'FREQ=DAILY' for every day, 'FREQ=WEEKLY;BYDAY=MO' for every Monday."
        )
    )
    timezone: str = Field(
        description="IANA timezone name (e.g. 'Africa/Cairo', 'America/New_York'). YOU MUST provide the user's timezone (fetch it using `get_user_preferences`)."
    )

class UpdateTaskTemplateSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """
    Schema for partially updating an existing TaskTemplate (PATCH).
    All fields are optional — only pass the ones the user wants to change.
    id (or master_task_id) is required to identify which TaskTemplate to update.
    """

    id: Optional[str] = Field(
        default=None,
        description="The unique UUID of the TaskTemplate to update. Also accepted as 'master_task_id'."
    )
    master_task_id: Optional[str] = Field(
        default=None,
        description="Alias for id. Use either 'id' or 'master_task_id' to identify the task."
    )
    title: Optional[str] = Field(
        default=None,
        description="New task title, if the user wants to rename it.\n"
    )
    start_time: Optional[str] = Field(
        default=None,
        description="New start time in 'HH:MM:SS' format (e.g. '14:30:00'), Just change the time not the date."
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


class DeleteTaskTemplateSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """Schema for soft-deleting a TaskTemplate."""

    id: str = Field(
        description="The unique UUID of the TaskTemplate to delete."
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

class UpdateTaskOverrideSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """Schema for rescheduling or updating a specific TaskOverride."""

    id: str = Field(description="The UUID of the specific TaskOverride.")
    status: Optional[str] = Field(
        default="RESCHEDULED",
        description="New status: PENDING, COMPLETED, SKIPPED, RESCHEDULED, FAILED."
    )
    new_datetime: Optional[str] = Field(
        default=None,
        description="The new ISO 8601 timestamp (required if status is 'RESCHEDULED')."
    )
    notes: Optional[str] = Field(default=None, description="Optional notes for this specific instance.")


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


MoodType = Literal[
    "happy", "content", "neutral", "tired",
    "stressed", "anxious", "sad", "frustrated", "angry",
]
EnergyLevel = Literal["high", "medium", "low"]


class LogVoiceMoodSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """Schema for recording the emotional state PUP perceived from the user's VOICE.

    This is judged by listening to the actual audio (tone, pace, energy, pitch,
    pauses, breathiness) — NOT inferred from the words alone.
    """

    mood: MoodType = Field(
        description=(
            "The user's emotional state as heard in their voice. MUST be exactly one of: "
            "happy, content, neutral, tired, stressed, anxious, sad, frustrated, angry."
        )
    )
    energy_level: EnergyLevel = Field(
        description="Overall vocal energy: 'high', 'medium', or 'low'."
    )
    evidence: str = Field(
        description=(
            "One short phrase describing the vocal cues you heard that led to this judgment "
            "(e.g. 'slow, flat delivery with long pauses', 'fast and high-pitched'). "
            "Base this on how they SOUND, not what they said."
        )
    )


class SocialSubTaskSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """A sub-task of a SocialTask. Field names match the SocialTask model."""
    title: str = Field(description="Title of the sub-task.")
    description: str = Field(default="", description="Optional description.")
    duration_minutes: int = Field(description="Duration in minutes.", ge=1)
    scheduled_at: Optional[str] = Field(
        default=None,
        description="ISO 8601 datetime. Null if this sub-task has no fixed time.",
    )


class CreateSocialTaskSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """
    Schema for creating a new SocialTask. Maps to the writable fields on the
    SocialTask model. Participants/friends are NOT set here yet (handled later);
    the task is created for the user alone.
    """
    title: str = Field(description="The title of the social task.")
    description: str = Field(default="", description="Optional description of the social task.")
    duration_minutes: int = Field(
        description="How long the social task takes, in minutes.", ge=1
    )
    scheduled_at: Optional[str] = Field(
        default=None,
        description=(
            "ISO 8601 datetime for when the social task happens (e.g. '2026-03-12T10:00:00Z'). "
            "Null if this is a container whose sub-tasks each carry their own time. "
            "Use find_free_time first to pick a good slot."
        ),
    )
    sub_tasks: List[SocialSubTaskSchema] = Field(
        default=[],
        description="Optional sub-tasks (1 level deep). Each can have its own scheduled_at.",
    )


class UpdateSocialTaskSchema(BaseModel):
    model_config = {"extra": "ignore"}
    """
    Schema for partially updating an existing SocialTask (PATCH).
    social_task_id identifies which one; only pass the fields the user wants changed.
    """
    social_task_id: str = Field(description="The UUID of the SocialTask to update.")
    title: Optional[str] = Field(default=None, description="New title.")
    description: Optional[str] = Field(default=None, description="New description.")
    duration_minutes: Optional[int] = Field(
        default=None, description="New duration in minutes.", ge=1
    )
    scheduled_at: Optional[str] = Field(
        default=None, description="New ISO 8601 datetime, or null to clear the schedule."
    )