# API Contract

All APIs return:

{
  "success": boolean,
  "data": object | null,
  "error": string | null
}

---

## Create Task

POST /api/tasks/

Request:
{
  "title": string,
  "category": string,
  "priority": "low|medium|high",
  "duration": integer,
  "visibility": "private|friends|specific",
  "participants": [user_ids]
}

---

## Mark Task Complete

POST /api/tasks/{id}/complete/

Request:
{
  "completion_date": "YYYY-MM-DD"
}