# Frontend Architecture

## Overview

React Native (0.83) mobile app with offline-first architecture.  
SQLite is the single source of truth on the client; the backend is synced via a queue when connectivity is available.

**Key dependencies:**  
`@reduxjs/toolkit`, `react-redux`, `@react-navigation/native-stack`, `@op-engineering/op-sqlite`, `axios`, `react-native-keychain`, `@react-native-community/netinfo`, `react-native-gesture-handler`, `react-native-svg`

---

## App Boot Sequence

```
index.js
  └─ App.tsx
       ├─ <Provider store={store}>        ← Redux
       └─ <GestureHandlerRootView>
            └─ Root.tsx
                 ├─ NetInfo listener      → dispatch(checkInternetConnectivity)
                 ├─ fetchUser()           → on connect
                 ├─ offline fallback      → load user from Keychain
                 ├─ applyQueue()          → flush sync queue on reconnect
                 └─ Render:
                      loading?  → LoadingScreen
                      user?     → AppNavigator
                      else      → AuthNavigator
```

`Root.tsx` is the orchestrator. It:
1. Subscribes to `NetInfo` and updates `network` slice on every change.
2. Fetches user from backend when online; falls back to Keychain when offline.
3. Flushes the sync queue every time the app regains connectivity.
4. Renders the correct navigator based on auth state.

---

## Folder Structure

```
src/
├── redux/              # Global state (Redux Toolkit)
├── DB/                 # Local SQLite database + sync queue
├── services/           # API clients & sync orchestrator
├── Hooks/              # Reusable hooks (useTasks, useTheme, etc.)
├── navigation/         # React Navigation stacks
├── screens/            # Screen-level components
├── components/         # Shared UI components
├── types/              # TypeScript type definitions
├── constants/          # Theme colors, task constants
├── utils/              # Storage helpers, validation
└── assets/             # Static assets
```

---

## Navigation

Two stack navigators, swapped based on auth state in `Root.tsx`.

### AuthNavigator (unauthenticated)

| Screen | Component |
|--------|-----------|
| `SignUp` | `screens/SignUp/signUp.tsx` |
| `Login` | `screens/Login/login.tsx` |

### AppNavigator (authenticated)

| Screen | Component |
|--------|-----------|
| `Home` | `HomeScreen` — daily overview, schedule, task cards |
| `Intro` | `IntroNavigator` — onboarding (permissions, notification, free-time habits) |
| `Profile` | `ProfileScreen` — user stats, streak |
| `EditProfile` | `EditProfile` — edit user info |
| `Schedule` | `ScheduleScreen` — calendar view |
| `Timer` | `TimerScreen` — focus timer with task selector |
| `Friends` | `FriendsListScreen` — friend list |
| `AddFriend` | `AddFriendScreen` — search & add users |
| `BlockedFriends` | `BlockedListScreen` — manage blocked users |
| `Tasks` | `TasksScreen` — full task list |
| `AddTask` | `AddTaskScreen` — create task form |
| `EditTask` | `EditTaskScreen` — edit task (receives `task` param) |
| `Settings` | `SettingsScreen` — app preferences |

A floating **AI button** (`AiButton` component) renders on top of all screens in `AppNavigator`.

---

## Redux Store

```
store
├── user      (userSlice)
├── network   (networkSlice)
└── tasks     (tasksSlice)
```

### `userSlice`

| Item | Detail |
|------|--------|
| State | `{ data: User \| null, loading, error }` |
| Async thunk | `fetchUser` — reads token from Keychain → `GET /user/:id` → caches user back to Keychain |
| Reducers | `setUser`, `clearUser` |

### `networkSlice`

| Item | Detail |
|------|--------|
| State | `{ isConnected: boolean, loading, error }` |
| Async thunk | `checkInternetConnectivity` — pings `8.8.8.8` to verify real internet access beyond WiFi |
| Reducers | `setNetworkStatus` |

### `tasksSlice`

| Item | Detail |
|------|--------|
| State | `{ items: SerializedTask[], loading, error }` |
| Reducers | `setTasks`, `upsertTask`, `removeTask`, `clearTasks`, `setLoading`, `setError` |

Tasks are serialized (dates → strings) before storing in Redux because Redux state must be serializable. The `useTasks` hook handles serialization/deserialization.

---

## Local Database (SQLite)

Uses `@op-engineering/op-sqlite` for high-performance synchronous SQLite on native.

### Tables

```
categories
  id   INTEGER PK AUTOINCREMENT
  name TEXT NOT NULL UNIQUE

tasks
  id          TEXT PK (hex UUID)
  user_id     INTEGER NOT NULL
  title       TEXT NOT NULL
  reminderTime INTEGER
  startTime   TEXT NOT NULL
  endTime     TEXT
  priority    TEXT (low|medium|high|none)
  emoji       TEXT
  created_at  TEXT
  updated_at  TEXT

task_categories          (many-to-many junction)
  task_id     TEXT FK → tasks
  category_id INTEGER FK → categories

task_repetitions
  task_id   TEXT FK → tasks
  frequency TEXT (once|daily|weekly|monthly|yearly|sunday..saturday)
  time      TEXT

task_completions         (sparse — only completed dates)
  id              TEXT PK
  task_id         TEXT FK → tasks
  completion_time TEXT
  date            TEXT

sync_queue               (offline operation queue)
  id        INTEGER PK AUTOINCREMENT
  type      TEXT (create|update|delete|complete|uncomplete)
  task_id   TEXT
  data      TEXT (JSON)
  timestamp INTEGER
  retries   INTEGER DEFAULT 0
```

### Indexes

- `idx_tasks_user_id`
- `idx_task_categories_task_id`
- `idx_task_repetitions_task_id`
- `idx_task_completions_task_id`
- `idx_task_completions_date`
- `idx_sync_queue_task_id`

### `taskRepository.ts`

Full CRUD with transactions:

- `createTask` / `createTaskWithId` — insert task + categories + repetitions in a transaction
- `getTaskById` — joins task + categories + repetitions + completions
- `getTasksByUserId`, `getTasksByDateRange`, `searchTasksByTitle`
- `updateTask` — partial update inside transaction (replaces categories/repetitions if provided)
- `deleteTask`, `deleteTasksByUserId`, `clearAllTaskData`
- Completion CRUD: `addTaskCompletion`, `removeTaskCompletionById`, `removeTaskCompletionByDate`, `getTaskCompletions`, `clearTaskCompletions`

---

## Offline-First Architecture & Sync Queue

### Design Principle

**Local-first**: all reads come from SQLite, all writes go to SQLite first.  
The backend is a sync target, not a gatekeeper.

### Sync Queue (`sync_queue` table)

Every mutating operation (create, update, delete, complete, uncomplete) is:
1. Applied immediately to SQLite (instant UI feedback).
2. If online → pushed to backend API.
3. If offline (or API fails) → enqueued in `sync_queue`.

Queue helpers:
- `queueCreateTask(taskId, payload)`
- `queueUpdateTask(taskId, payload)`
- `queueDeleteTask(taskId)`
- `queueCompleteTask(taskId, { completion_time, date })`
- `queueUncompleteTask(taskId, { date })`

### Queue Drain (`applyQueue`)

Triggered automatically by `Root.tsx` when connectivity is restored.

```
applyQueue()
  ├─ Guard: skip if already running, offline, or no token
  ├─ getPendingSyncItems() — ordered by timestamp ASC
  ├─ For each item:
  │     ├─ Skip if retries >= MAX_RETRIES (5)
  │     ├─ Resolve task_id through local→backend ID map
  │     ├─ Execute backend API call by type
  │     ├─ On success → removeSyncItem()
  │     └─ On failure → incrementSyncItemRetries()
  └─ Maintains idMap<localId, backendId> for create chains
```

### Local ID Mapping

Tasks created offline get IDs like `local_<uuid>`. When the queue drains:
1. `create` sends to backend → gets real backend ID.
2. `idMap` stores `localId → backendId`.
3. Subsequent queue items for the same task use the resolved backend ID.
4. Local SQLite row is replaced: delete local row → create with backend ID.

### `syncService.ts` — Unified Task Service

All screen/hook code uses `syncService` (never calls API or DB directly):

| Function | Online | Offline |
|----------|--------|---------|
| `addTask` | API create → store with backend ID | Store with `local_` ID → queue create |
| `getTask` / `getTasks` | Read from SQLite | Read from SQLite |
| `updateTask` | SQLite first → API update | SQLite first → queue update |
| `deleteTask` | SQLite first → API delete | SQLite first → queue delete (or discard if local-only) |
| `completeTask` | SQLite first → API complete → update local ID | SQLite first → queue complete |
| `uncompleteTask` | SQLite first → API uncomplete | SQLite first → queue uncomplete |
| `fullSyncTasks` | applyQueue → wipe local → re-fetch all from backend | No-op |
| `getCategories` | API call | Read from local SQLite |

### Full Sync

`fullSyncTasks()` is called on login. It:
1. Flushes the queue (`applyQueue`).
2. Wipes all local task data and sync queue.
3. Re-fetches all tasks + completions from backend.
4. Rebuilds local SQLite from scratch.

---

## Hooks

### `useTasks(userId)`

Central task management hook. Bridges `syncService` ↔ Redux.

- Loads tasks from SQLite on mount → dispatches to `tasksSlice`.
- Converts `Task` (with `Date` objects) ↔ `SerializedTask` (with strings) for Redux.
- Exposes: `tasks`, `loading`, `error`, `createTask`, `updateTask`, `deleteTask`, `completeTask`, `uncompleteTask`, `refresh`.

### `useTasksForSpecificDay(userId, date)`

Wraps `useTasks`, filters to a single date using `isTaskOnDate()`.

- Returns `pendingTasks`, `completedTasks`, `canComplete`, `toggleComplete`.
- Uses `useMemo` keyed on `YYYY-MM-DD` string for stable references.

### `useLogin()`

1. Save token + id to Keychain.
2. Drop all local tables → `fullSyncTasks()` → `fetchUser()`.

### `useLogout()`

1. Clear Keychain.
2. `clearUser()` + `clearTasks()` in Redux.
3. Drop all local tables.

### `useTheme()`

Listens to `Appearance` changes. Returns `{ theme, colors }` from `constants/colors.ts`.

---

## Services

### `api.ts`

Axios instance with:
- `baseURL` from env (`API_URL`)
- Request interceptor: attaches `Authorization: token <token>` from Keychain

### `TaskService/tasks.ts`

Raw backend API calls:
- `createTask`, `getTasks` (paginated), `getTaskById`, `updateTask`, `deleteTask`, `patchTask`
- `completeTask`, `uncompleteTask`, `historyTask`
- Handles snake_case ↔ camelCase mapping, category ID resolution

### `TaskService/syncService.ts`

See [Offline-First Architecture](#offline-first-architecture--sync-queue) above.

### `userAuthServices/`

- `login.ts` — email/password login
- `signup.ts` — registration
- `googleAuth.ts` — Google OAuth
- `getuser.ts` — fetch user profile
- `editUser.ts` — update user data

### `interestService/`

- `getCategories.ts` — fetch task categories
- `getInterests.ts` — fetch interest list
- `userService/changeUserInterests.ts`, `getUserInterests.ts`

---

## Secure Storage

Uses `react-native-keychain` (not AsyncStorage) for sensitive data.

```
Keychain (encrypted)
  └── "appData" (JSON string)
       ├── auth.token    — DRF auth token
       ├── auth.id       — user ID
       └── auth.user     — full User object (offline fallback)
```

Helpers in `utils/storage/`:
- `saveData`, `getData`, `patchData`, `clearData` — auth-specific
- `getStorageItem`, `setStorageItem`, `removeStorageItem`, `clearStorage` — generic

---

## Components

### Layout & Navigation
- **BottomBar** — emoji-based tab bar (Tasks, Friends, Home, Timer, Settings)
- **OfflineBar** — red banner when `isConnected === false`
- **AiButton** — draggable floating button (pan gesture via `react-native-gesture-handler`)

### Task
- **TaskCard** — full and compact variants; priority color coding, repetition badges, completion toggle
- **Schedule** — full calendar with month picker, day selector, task cards, complete toggle, task detail modal

### Timer
- **TimerDial** — SVG circular progress with streak display
- **CountdownText** — MM:SS formatter
- **TaskSelector** — pick task for focus session
- **StartButton**, **GiveUpButton**, **GiveUpDialog** (modal confirmation)

### Friends
- **FriendItem** — context menu (remove/block)
- **BlockedItem** — unblock action
- **UserSearchItem** — send friend request

### Settings
- **SettingsSection**, **SettingsNavItem**, **SettingsSwitchItem**, **SettingsSelectItem**
- **LogoutButton**

### Auth
- **LoginGoogle** — Google Sign-In button with loading state

---

## Type System

### `Task`

```typescript
type Task = {
  id: string;
  user_id: number;
  title: string;
  Categorys: Category[];
  completions: TaskCompletion[];   // sparse: only completed dates
  reminderTime: number | null;     // minutes before due
  startTime: Date;
  endTime: Date | null;            // null = forever
  priority: 'low' | 'medium' | 'high' | 'none';
  repetition: TaskRepetition[];
  emoji: string;
};
```

### Date Logic (`types/task.ts`)

- `isTaskOnDate(task, date)` — checks repetition rules + completion history
- `isTaskCompletedForDate(task, date)` — sparse completion lookup
- `canCompleteForDate(date)` — blocks future completions
- `toLocalDateString(date)` — `YYYY-MM-DD` in local timezone (avoids UTC date shift)

### `User`

```typescript
type User = {
  id: number;
  username: string;
  email: string;
  google_auth_id: string | null;
  gender: string;
  birth_day: Date;
  streak_cnt: number;
  joined_on: Date;
  token: string;
  has_interests?: boolean;
};
```

---

## Theming

System-aware light/dark theme via `Appearance` API.

| Token | Light | Dark |
|-------|-------|------|
| `background` | `#F9FAFB` | `#0F172A` |
| `surface` | `#FFFFFF` | `#1E293B` |
| `primary` | `#2563EB` | `#3B82F6` |
| `text` | `#111827` | `#F9FAFB` |
| `secondaryText` | `#6B7280` | `#9CA3AF` |
| `error` | `#EF4444` | `#F97373` |

Consumed via `useTheme()` hook throughout the app.

---

## Data Flow Diagram

```
┌──────────────┐
│   Screens    │  uses hooks
└──────┬───────┘
       │
┌──────▼───────┐
│    Hooks     │  useTasks, useTasksForSpecificDay
└──────┬───────┘
       │
┌──────▼───────┐
│  syncService │  offline-first orchestrator
└──┬───────┬───┘
   │       │
   ▼       ▼
┌──────┐ ┌──────────┐
│SQLite│ │ REST API  │  axios → Django backend
└──┬───┘ └──────────┘
   │
   ├── tasks, categories, repetitions, completions
   └── sync_queue (pending operations)
```

---

## Rules

- **No business logic in UI** — task scheduling, completion rules, date logic live in `types/task.ts` and `syncService.ts`.
- **All validation must also exist in backend** — frontend validation is for UX only.
- **SQLite is the local source of truth** — Redux is a view cache; SQLite persists across sessions.
- **Never call API or DB directly from screens** — always go through `syncService` via hooks.
- **Local IDs use `local_` prefix** — distinguishes unsynced tasks from backend tasks.