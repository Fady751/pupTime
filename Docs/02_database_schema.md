# Database Design Philosophy

## Core Concept

The system separates:

- Task Definition
- Task Participation
- Task Completion History

## Task

Represents a task definition created by a user.

Fields:
- owner
- title
- category
- priority
- repetition
- visibility
- reminder_time

## TaskHistory

Represents task completion events.

Each completion is per user and per date.

Constraints:
- Unique per (task, user, completion_date)
- Indexed for performance

## PomodoroSession

Represents focused sessions.

Tracks:
- task
- user
- start_time
- end_time
- was_completed
- interruption_count