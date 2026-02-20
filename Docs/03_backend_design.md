# Backend Architecture

The backend follows modular Django apps:

- accounts
- tasks
- social
- ai_engine
- timer
- notifications

## Design Rules

- No duplicated models for SocialTask and Task.
- Social logic is handled through TaskParticipant model.
- Status is derived, not stored in Task table.
- Completion is event-based (TaskHistory).