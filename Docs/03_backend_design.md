# Backend Architecture

This document is intentionally short. It only explains **what the backend is for** and **where to find more detail**. All specifics (architecture, schema, endpoints, business rules, AI, frontend) live in the other docs under `Docs/`.

## Purpose

- Provide a Django REST API that powers the mobile app.
- Own three domains: user identity, personal tasks, and (future) friendships.

## Modules (High Level)

- `user` – authentication, profiles, and user interests.
- `task` – personal tasks, recurrence, and completion history.
- `friendship` – friendship relationships (currently model-only; API not wired yet).

## Where to Look Next

- Overall system & architecture: `00_project_overview.md`, `01_architecture.md`.
- Data models & relationships: `02_database_schema.md`.
- API endpoints & payloads: `04_api_contract.md`.
- AI behavior & recommendation logic: `05_ai_engine_design.md`.
- Frontend structure & integration: `06_frontend_architecture.md`.
- Domain rules & validation: `07_business_rules.md`.
- Roadmap & planned features: `08_future_scope.md`.

This file is just a map; it avoids repeating anything already covered in those documents.