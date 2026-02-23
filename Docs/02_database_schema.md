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
- `id` (PK, UUIDField, default uuid4)
- `user` (FK → `user.User`, CASCADE, related_name=`tasks`)
- `title` (CharField, max_length=255)
- `priority` (CharField, max_length=10, choices: `none`, `low`, `medium`, `high`, default `none`)
- `emoji` (CharField, max_length=8, blank, default="")
- `start_datetime` (DateTimeField) — when the task starts, or the first instance of a series
- `duration_minutes` (IntegerField, null, blank) — duration of the task in minutes
- `is_recurring` (BooleanField, default=False)
- `rrule` (CharField, max_length=255, null, blank) — RFC 5545 recurrence rule, e.g. `FREQ=DAILY;BYDAY=MO,WE,FR`
- `timezone` (CharField, max_length=64, default='UTC') — e.g. `Africa/Cairo`
- `created_at` (DateTimeField, auto_now_add)
- `updated_at` (DateTimeField, auto_now)
- `is_deleted` (BooleanField, default=False) — soft delete flag

**Many-to-many:**
- `categories` (M2M → `user.InterestCategory`, blank, related_name=`tasks`)

**Constraints / Business Rules (enforced in serializer):**
- `rrule` is required when `is_recurring` is True
- `duration_minutes` must be non-negative if provided

---

### TaskOverride

Per-instance status tracker for recurring tasks. Each row represents one scheduled occurrence.

**Table:** `task_taskoverride`

**Fields:**
- `id` (PK, UUIDField, default uuid4)
- `task` (FK → `Task`, CASCADE, related_name=`overrides`)
- `instance_datetime` (DateTimeField) — the exact timestamp this instance was originally scheduled for
- `status` (CharField, max_length=15, choices: `PENDING`, `COMPLETED`, `SKIPPED`, `RESCHEDULED`, `FAILED`, default `PENDING`)
- `new_datetime` (DateTimeField, null, blank) — used only when status is `RESCHEDULED`
- `created_at` (DateTimeField, auto_now_add)
- `updated_at` (DateTimeField, auto_now)
- `is_deleted` (BooleanField, default=False) — soft delete flag

**Indexes:**
- `Index(fields=['task', 'instance_datetime'])`

**Constraints:**
- `unique_together = ('task', 'instance_datetime')`

**Semantics:**
- Overrides are auto-generated for 1 month ahead when a recurring task is created.
- Completion is tracked by setting `status` to `COMPLETED`.
- There is **no** `status` field on `Task`; status is per-instance via overrides.
- Non-recurring tasks have no overrides.

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
- `Task` 1─* `TaskOverride`
- `User` *─* `User` (via `Friendship` with `sender` / `receiver` roles)

These tables and relations fully reflect the current Django models and migrations in the backend.