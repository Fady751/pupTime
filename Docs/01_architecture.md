# System Architecture

## High-Level Flow

Mobile App (React Native)
        ↓
Django REST API
        ↓
PostgreSQL

AI Layer:
User Request → Backend Validation → AI Call → Backend Re-Validation → Save

## Core Principles

1. AI never writes directly to database.
2. PostgreSQL is the single source of truth.
3. All scheduling decisions are validated server-side.
4. Business rules must exist independent of AI.