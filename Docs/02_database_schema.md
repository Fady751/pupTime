# Database Schema

This document describes the **actual database schema** implemented in the Django project under `Backend/`.

Models are grouped by app, with fields, constraints, and relationships.

---

## `user` App

### User
Custom auth model extending `AbstractUser`.

**Table:** `user_user`

**Fields (in addition to Django's default auth fields):**
- `google_auth_id` (CharField, max_length=255, unique, null, blank) — Google account linkage
- `gender` (CharField, max_length=20, null, blank)
- `birth_day` (DateField, null, blank)
- `streak_cnt` (IntegerField, default=0)
- `joined_on` (DateTimeField, auto_now_add)

**Relationships:**
- One-to-many: `User` → `Task` (`task.Task.user` FK)
- Many-to-many: `User` ↔ `Interest` via `UserInterest` (`interests` field)

**Indexes / Constraints:**
- Standard auth uniqueness on `username`
- `email` is enforced unique at the application/serializer level (case-insensitive checks)

---

### InterestCategory

**Table:** `user_interestcategory`

**Fields:**
- `id` (PK, AutoField)
- `name` (CharField, max_length=100, unique)

**Usage:**
- Groups `Interest` records (and indirectly used to categorize `Task`s).

---

### Interest

**Table:** `user_interest`

**Fields:**
- `id` (PK, AutoField)
- `title` (CharField, max_length=255, unique)
- `category` (FK → `InterestCategory`, CASCADE, related_name=`interests`)

**Relationships:**
- Many-to-one: `Interest` → `InterestCategory`
- Many-to-many (through): `Interest` ↔ `User` via `UserInterest`

---

### UserInterest (through table)

**Table:** `user_userinterest`

**Fields:**
- `id` (PK, AutoField)
- `user` (FK → `User`, CASCADE, related_name=`user_interests`)
- `interest` (FK → `Interest`, CASCADE, related_name=`user_interests`)

**Constraints:**
- `unique_together = ('user', 'interest')` — a user cannot have the same interest twice

---

## `task` App

The task app models user tasks, recurrence, and completion history.

### Task

**Table:** `task_task`

**Fields:**
- `id` (PK, AutoField)
- `user` (FK → `user.User`, CASCADE, related_name=`tasks`)
- `title` (CharField, max_length=255)
- `reminder_time` (IntegerField, null, blank) — minutes before `start_time`
- `start_time` (DateTimeField)
- `end_time` (DateTimeField, null, blank)
- `priority` (CharField, max_length=10, choices: `none`, `low`, `medium`, `high`, default `none`)
- `emoji` (CharField, max_length=8, blank, default="")

**Many-to-many:**
- `categories` (M2M → `user.InterestCategory`, blank, related_name=`tasks`)

**Constraints / Business Rules (enforced in serializer):**
- `end_time` must be strictly after `start_time` when both are provided
- `reminder_time` must be a non‑negative integer if provided

---

### TaskRepetition

Represents recurrence patterns for a task.

**Table:** `task_taskrepetition`

**Fields:**
- `id` (PK, AutoField)
- `task` (FK → `Task`, CASCADE, related_name=`repetitions`)
- `frequency` (CharField, max_length=16, choices:
	- `once`, `daily`, `weekly`, `monthly`, `yearly`
	- `sunday`, `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`)
- `time` (TimeField, null, blank)

**Notes:**
- Update strategy is *replace-all*: on task update, existing repetitions are deleted and re-created from payload.

---

### TaskHistory

Event-based completion log for tasks.

**Table:** `task_taskhistory`

**Fields:**
- `id` (PK, AutoField)
- `task` (FK → `Task`, CASCADE, related_name=`history`)
- `completion_time` (DateTimeField)

**Indexes:**
- `Index(fields=['task', 'completion_time'])` — optimized queries per-task, ordered by time

**Semantics:**
- Each row represents a single completion event for a task.
- A task can have multiple completions (useful for habits).
- There is **no** `status` field on `Task`; "done" is derived from history.

---

## `friendship` App

Models social relationships between users. Currently, only the data model exists; no API layer yet.

### Friendship

**Table:** `friendship_friendship`

**Fields:**
- `id` (PK, AutoField — from migrations)
- `sender` (FK → `user.User`, CASCADE, related_name=`sender`, `unique=True` in model)
- `receiver` (FK → `user.User`, CASCADE, related_name=`receiver`, `unique=True` in model)
- `blocked_by` (FK → `user.User`, SET_NULL, null, blank, related_name=`blocked_by`)
- `sent_at` (DateTimeField, auto_now_add)
- `accepted_at` (DateTimeField, auto_now_add, null, blank)
- `status` (IntegerField, choices from `Status` enum, default `pending`)

**Status choices (Status IntegerChoices):**
- `0` — pending
- `1` — accepted
- `2` — canceled
- `3` — blocked

**Constraints:**
- `unique_together = ('sender', 'receiver')` — ensures at most one friendship record per pair.

**Note:**
- The `unique=True` flags on `sender` and `receiver` effectively limit each user to a single friendship, which is likely not desired and should be revisited when implementing the friendship API.

---

## Global Relationships Overview

- `User` 1─* `Task`
- `User` *─* `Interest` (via `UserInterest`)
- `Task` *─* `InterestCategory` (M2M via `Task.categories`)
- `Task` 1─* `TaskRepetition`
- `Task` 1─* `TaskHistory`
- `User` *─* `User` (via `Friendship` with `sender` / `receiver` roles)

These tables and relations fully reflect the current Django models and migrations in the backend.