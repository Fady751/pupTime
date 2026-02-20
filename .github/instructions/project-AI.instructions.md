---
description: PupTime global architectural and documentation rules
applyTo: "**"
---

# PupTime Engineering Rules

## Architecture

- Backend: Django + DRF
- Database: PostgreSQL (single source of truth)
- AI: Assistant only (never writes directly to DB)
- Task completion is event-based (TaskHistory)
- Do not reintroduce Task.status
- Avoid duplicated models for similar concepts
- Keep business logic in backend, not frontend

## Code Standards

- Follow Django best practices
- Use serializers for validation
- Validate AI outputs before saving
- Avoid tight coupling between apps
- Add indexes for frequently queried fields

## Documentation Awareness

- Treat `/docs` folder as architectural source of truth
- If modifying models, APIs, or business rules:
  → Update relevant docs file
- Do not change architecture unless explicitly requested

## When Unsure

Do not assume business rules.
Ask for clarification.
Preserve architectural consistency.