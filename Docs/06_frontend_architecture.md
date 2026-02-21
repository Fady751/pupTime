# Frontend Architecture

> Concise architectural reference for the PupTime React Native client.  
> For schema details, API mappings, hook contracts, and component inventory see [06a_frontend_implementation.md](06a_frontend_implementation.md).

---

## 1. Core Decisions

| Decision | Rationale |
|----------|-----------|
| **Offline-first** | Writes go to SQLite immediately; backend is a sync target, not a gatekeeper |
| **SQLite = local source of truth** | Persists across sessions; Redux is a view cache only |
| **Single sync orchestrator** | All data access routes through `syncService`; screens never touch DB or API |
| **Keychain for secrets** | Encrypted storage (not AsyncStorage) for tokens and user data |

**Stack:** React Native 0.83 · TypeScript · Redux Toolkit · op-sqlite · Axios · React Navigation

---

## 2. Layered Architecture

```
┌────────────────────────────────────────────────┐
│  UI Layer — Screens · Components · Navigation  │
└─────────────────────┬──────────────────────────┘
                      │ hooks
┌─────────────────────▼──────────────────────────┐
│  Hook Layer — useTasks · useLogin · useTheme   │
└─────────────────────┬──────────────────────────┘
                      │ syncService
┌─────────────────────▼──────────────────────────┐
│  Service Layer                                 │
│  syncService ─┬─ taskRepository (SQLite CRUD)  │
│               └─ REST API clients (Axios)      │
└─────────────────────┬──────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────┐
│  Persistence — SQLite DB · sync_queue · Keychain│
└────────────────────────────────────────────────┘
```

**Data flows down.** Screens call hooks. Hooks call `syncService`. `syncService` writes to SQLite first, then optionally to the backend. Nothing bypasses this chain.

---

## 3. Boot & Auth

```
index.js → App.tsx → Root.tsx
  1. NetInfo listener → networkSlice (real connectivity check via ping)
  2. Online?  → fetchUser() from backend, cache to Keychain
     Offline? → load User from Keychain into Redux
  3. applyQueue() → flush pending sync items on reconnect
  4. Render: loading → LoadingScreen | user → AppNavigator | else → AuthNavigator
```

| Event | Flow |
|-------|------|
| **Login** | Keychain save → drop local DB → `fullSyncTasks()` → `fetchUser()` |
| **Logout** | Keychain clear → Redux clear → drop local DB |
| **Reconnect** | `applyQueue()` drains offline operations to backend |

---

## 4. Offline Sync Engine

### Write Path

```
User mutation → SQLite (instant)
                 ├─ Online → API call
                 │            ├─ OK  → done
                 │            └─ Fail → enqueue
                 └─ Offline → enqueue in sync_queue
```

### Sync Queue

SQLite table (`sync_queue`) storing pending operations as FIFO entries:
- Types: `create | update | delete | complete | uncomplete`
- Each entry has `task_id`, JSON `data`, `timestamp`, `retries` (max 5)
- Drained by `applyQueue()` on reconnect, ordered by timestamp

### Local ID Strategy

Offline-created tasks get `local_<uuid>` IDs. On drain, `create` items return a backend ID. An in-memory `idMap` remaps all subsequent queue items for the same task. The local SQLite row is replaced with the backend ID.

### Full Sync

`fullSyncTasks()` (on login): drain queue → wipe local data → re-fetch all tasks + completions from backend → rebuild SQLite.

---

## 5. State Management

```
Redux Store
├── user     { data: User | null, loading, error }
├── network  { isConnected, loading, error }
└── tasks    { items: SerializedTask[], loading, error }
```

- `userSlice`: async `fetchUser` thunk (Keychain → API → cache back)
- `networkSlice`: async `checkInternetConnectivity` thunk (pings 8.8.8.8)
- `tasksSlice`: synchronous reducers only; populated by `useTasks` hook from SQLite

**Serialization boundary:** `Task` has `Date` objects → serialized to ISO strings for Redux → deserialized back in hooks.

---

## 6. Navigation

| Stack | Routes |
|-------|--------|
| **Auth** | `SignUp`, `Login` |
| **App** | `Home`, `Tasks`, `AddTask`, `EditTask`, `Schedule`, `Timer`, `Friends`, `AddFriend`, `BlockedFriends`, `Profile`, `EditProfile`, `Settings`, `Intro` |

Swapped in `Root.tsx` based on `user` state. Floating `AiButton` overlays all App screens.

---

## 7. Constraints

| Rule | Why |
|------|-----|
| No business logic in UI | Lives in `types/task.ts` and `syncService.ts` |
| All validation also in backend | Frontend validation is UX-only |
| SQLite is local source of truth | Redux is ephemeral; SQLite persists |
| Screens never call API or DB | Always through `syncService` via hooks |
| `local_` prefix for offline IDs | Distinguishes unsynced from backend tasks |
| Keychain only, no AsyncStorage | Tokens must be encrypted at rest |
| Dates as local `YYYY-MM-DD` | Avoids UTC timezone shift in completions |