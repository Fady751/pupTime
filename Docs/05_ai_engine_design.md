# AI Engine Design

AI is used as an assistant, not decision authority.

Flow:

1. User sends task request (text/voice)
2. Backend constructs structured prompt
3. Gemini returns structured JSON
4. Backend validates JSON
5. Backend applies scheduling logic
6. Result saved in DB

AI Output must match schema:

{
  "title": string,
  "duration": integer,
  "priority": string,
  "suggested_time": ISO datetime
}

Invalid AI responses are rejected.