# API Contract

Base URL: `/`

Authentication: Token-based (`Authorization: Token <token>`)
Endpoints marked 🔒 require authentication.

---

# User Endpoints

All prefixed with `/user/`

---

## Register

POST /user/register/

Request:
{
  "username": string,
  "email": string,
  "password": string (min 8 chars),
  "google_auth_id": string | null (optional),
  "gender": string | null (optional),
  "birth_day": "YYYY-MM-DD" | null (optional)
}

Response 201:
{
  "id": integer,
  "username": string,
  "email": string,
  "google_auth_id": string | null,
  "gender": string | null,
  "birth_day": "YYYY-MM-DD" | null,
  "streak_cnt": integer,
  "joined_on": "ISO-datetime",
  "has_interests": boolean,
  "token": string
}

---

## Login

POST /user/login/

Request:
{
  "email": string,
  "password": string
}

Response 200:
{
  "token": string,
  "user_id": integer,
  "username": string,
  "email": string
}

Response 401:
{
  "error": "Invalid credentials. Please check your email and password."
}

---

## Google Auth

POST /user/auth/google/

Request:
{
  "id_token": string (Google ID token from frontend)
}

Response 200:
{
  "token": string,
  "user_id": integer,
  "username": string,
  "email": string,
  "is_new_user": boolean,
  "has_interests": boolean
}

---

## Get User Details 🔒

GET /user/{user_id}/

Response 200:
{
  "id": integer,
  "username": string,
  "email": string,
  "google_auth_id": string | null,
  "gender": string | null,
  "birth_day": "YYYY-MM-DD" | null,
  "streak_cnt": integer,
  "joined_on": "ISO-datetime",
  "has_interests": boolean
}

---

## Update User (Full) 🔒

PUT /user/{user_id}/

Only the owner can update their own profile.

Request:
{
  "username": string,
  "email": string,
  "password": string (optional, min 8 chars),
  "google_auth_id": string | null,
  "gender": string | null,
  "birth_day": "YYYY-MM-DD" | null
}

Response 200: same shape as Get User Details

Response 403:
{
  "error": "You can only update your own profile."
}

---

## Update User (Partial) 🔒

PATCH /user/{user_id}/

Only the owner can update their own profile. Any subset of fields accepted.

Request: any subset of Update User fields

Response 200: same shape as Get User Details

---

## Delete User 🔒

DELETE /user/{user_id}/

Only the owner can delete their own profile.

Response 204: No content

Response 403:
{
  "error": "You can only delete your own profile."
}

---

## List Interest Categories

GET /user/interest-categories/

Response 200:
[
  {
    "id": integer,
    "name": string
  }
]

---

## List Interests

GET /user/interests/

Query params:
- `category` (optional): filter by category name (case-insensitive)

Response 200:
[
  {
    "id": integer,
    "title": string,
    "category": {
      "id": integer,
      "name": string
    }
  }
]

---

## Get User Interests 🔒

GET /user/{user_id}/interests/

Response 200:
[
  {
    "id": integer,
    "title": string,
    "category": {
      "id": integer,
      "name": string
    }
  }
]

---

## Set User Interests (Replace All) 🔒

PUT /user/{user_id}/interests/

Only the owner can update their own interests. Replaces all existing interests.

Request:
{
  "interest_ids": [integer]
}

Response 200: same shape as Get User Interests

Response 403:
{
  "error": "You can only update your own interests."
}

---

## Remove All User Interests 🔒

DELETE /user/{user_id}/interests/

Only the owner can remove their own interests.

Response 204: No content

---

# Task Endpoints 🔒

All prefixed with `/task/`. All require authentication.

---

## List Tasks

GET /task/

Query params:
- `start_date` (optional): ISO-datetime start of date range
- `end_date` (optional): ISO-datetime end of date range
- `priority` (optional): "none" | "low" | "medium" | "high"
- `category` (optional): InterestCategory id (integer)
- `ordering` (optional): "start_datetime" | "-start_datetime" | "priority" | "-priority"
- `page` (optional): page number
- `page_size` (optional): items per page (max 100, default 20)

Date range behaviour:
- Non-recurring tasks: included if `start_datetime` falls within range
- Recurring tasks: included if any override `instance_datetime` falls within range
- Overrides in the response are filtered to the requested range

Default ordering: `-start_datetime`

Response 200:
{
  "count": integer,
  "next": string | null,
  "previous": string | null,
  "results": [
    {
      "id": uuid,
      "user": integer,
      "title": string,
      "categories": [{"id": integer, "name": string}],
      "priority": "none|low|medium|high",
      "emoji": string,
      "start_datetime": "ISO-datetime",
      "duration_minutes": integer | null,
      "is_recurring": boolean,
      "rrule": string | null,
      "timezone": string,
      "overrides": [
        {
          "id": uuid,
          "instance_datetime": "ISO-datetime",
          "status": "PENDING|COMPLETED|SKIPPED|RESCHEDULED|FAILED",
          "new_datetime": "ISO-datetime" | null,
          "created_at": "ISO-datetime",
          "updated_at": "ISO-datetime"
        }
      ],
      "created_at": "ISO-datetime",
      "updated_at": "ISO-datetime"
    }
  ]
}

---

## Create Task

POST /task/

Request:
{
  "title": string,
  "categories": [integer] (optional, InterestCategory ids),
  "start_datetime": "ISO-datetime",
  "duration_minutes": integer | null (optional),
  "is_recurring": boolean (default false),
  "rrule": string | null (required if is_recurring is true, e.g. "FREQ=DAILY"),
  "timezone": string (default "UTC"),
  "priority": "none|low|medium|high" (default "none"),
  "emoji": string (optional)
}

When `is_recurring` is true, the backend auto-generates TaskOverride instances
for one month from today.

Response 201: single task object (same shape as list item)

---

## Get Task

GET /task/{id}/

Response 200: single task object

---

## Update Task (Full)

PUT /task/{id}/

Request: same shape as Create Task (all fields required)

Response 200: single task object

---

## Update Task (Partial)

PATCH /task/{id}/

Request: any subset of Create Task fields

Response 200: single task object

---

## Delete Task (Soft Delete)

DELETE /task/{id}/

Soft-deletes the task (sets `is_deleted=True`).

Response 204: No content

---

## Update Override Status

PATCH /task/{id}/override/{override_id}/

Update the status of a single TaskOverride instance (complete, skip, reschedule).

Request:
{
  "status": "PENDING" | "COMPLETED" | "SKIPPED" | "RESCHEDULED" | "FAILED",
  "new_datetime": "ISO-datetime" (required when status is "RESCHEDULED")
}

Response 200:
{
  "id": uuid,
  "instance_datetime": "ISO-datetime",
  "status": string,
  "new_datetime": "ISO-datetime" | null,
  "created_at": "ISO-datetime",
  "updated_at": "ISO-datetime"
}

---

# Utility Endpoints

## Swagger Docs

GET /swagger/

## ReDoc Docs

GET /redoc/

## Health Check

GET /hello/

Response 200: "Hello, World :)!"