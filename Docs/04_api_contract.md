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
- `priority` (optional): "none" | "low" | "medium" | "high"
- `category` (optional): InterestCategory id (integer)
- `ordering` (optional): "start_time" | "-start_time" | "end_time" | "-end_time" | "priority" | "-priority"
- `page` (optional): page number
- `page_size` (optional): items per page (max 100, default 20)

Default ordering: `-start_time`

Response 200:
{
  "count": integer,
  "next": string | null,
  "previous": string | null,
  "results": [
    {
      "id": integer,
      "user": integer,
      "title": string,
      "categories": [integer],
      "reminder_time": integer | null,
      "start_time": "ISO-datetime",
      "end_time": "ISO-datetime" | null,
      "priority": "none|low|medium|high",
      "emoji": string,
      "repetitions": [
        {
          "id": integer,
          "frequency": "once|daily|weekly|monthly|yearly|sunday|monday|tuesday|wednesday|thursday|friday|saturday",
          "time": "HH:MM:SS" | null
        }
      ]
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
  "reminder_time": integer | null (optional, minutes),
  "start_time": "ISO-datetime",
  "end_time": "ISO-datetime" | null (optional, must be after start_time),
  "priority": "none|low|medium|high" (default "none"),
  "emoji": string (optional),
  "repetitions": [
    {
      "frequency": "once|daily|weekly|monthly|yearly|sunday|monday|tuesday|wednesday|thursday|friday|saturday",
      "time": "HH:MM:SS" | null
    }
  ] (optional)
}

Response 201: single task object (same shape as list item)

---

## Get Task

GET /task/{id}/

Response 200: single task object

---

## Update Task (Full)

PUT /task/{id}/

Request: same shape as Create Task

Response 200: single task object

---

## Update Task (Partial)

PATCH /task/{id}/

Request: any subset of Create Task fields

Response 200: single task object

---

## Delete Task

DELETE /task/{id}/

Response 204: No content

---

## Mark Task Complete

POST /task/{id}/complete/

Request:
{
  "completion_time": "ISO-datetime" (optional, defaults to now)
}

Response 201:
{
  "id": integer,
  "task": integer,
  "completion_time": "ISO-datetime"
}

---

## Remove Task Completion

POST /task/{id}/uncomplete/

Target a specific completion by one of these (if none given, removes the latest):

Request:
{
  "completion_id": integer (optional),
  "date": "YYYY-MM-DD" (optional, removes latest completion from that date)
}

Response 200:
{
  "message": "Completion removed",
  "deleted_completion_time": "ISO-datetime"
}

Response 404:
{
  "error": "No completions found for this task"
}

---

## Get Task Completion History

GET /task/{id}/history/

Response 200:
[
  {
    "id": integer,
    "completion_time": "ISO-datetime",
    "date": "YYYY-MM-DD"
  }
]

---

# Utility Endpoints

## Swagger Docs

GET /swagger/

## ReDoc Docs

GET /redoc/

## Health Check

GET /hello/

Response 200: "Hello, World :)!"