# Frontend Implementation Details

> Detailed implementation reference for the PupTime React Native client.  
> For high-level architecture see [06_frontend_architecture.md](06_frontend_architecture.md).

---

## Table of Contents

1. [Source Structure](#1-source-structure)
2. [Persistence — SQLite Schema](#2-persistence--sqlite-schema)
3. [Persistence — Repository API](#3-persistence--repository-api)
4. [Persistence — Secure Storage](#4-persistence--secure-storage)
5. [Sync Queue — Implementation](#5-sync-queue--implementation)
6. [Sync Service — Operation Table](#6-sync-service--operation-table)
7. [Redux Slices](#7-redux-slices)
8. [Service Layer — API Clients](#8-service-layer--api-clients)
9. [Hook Contracts](#9-hook-contracts)
10. [Navigation — Route Map](#10-navigation--route-map)
11. [Component Inventory](#11-component-inventory)
12. [Type Definitions](#12-type-definitions)
13. [Theming Tokens](#13-theming-tokens)

---

## 1. Source Structure

```
src/
├── redux/              State slices (user, tasks, network)
│   ├── store.ts
│   ├── userSlice.ts
│   ├── tasksSlice.ts
│   └── networkSlice.ts
├── DB/                 SQLite schema, repository, sync queue
│   ├── database.ts     Schema init, open/close/drop
│   ├── taskRepository.ts  Full CRUD with transactions
│   ├── sync_queue.ts   Queue insert/read/remove helpers
│   └── index.ts        Barrel export
├── services/           API clients, sync orchestrator
│   ├── api.ts          Axios instance + auth interceptor
│   ├── loginWithGoogle.ts
│   ├── TaskService/
│   │   ├── tasks.ts        Raw backend API calls
│   │   └── syncService.ts  Offline-first orchestrator
│   ├── userAuthServices/
│   │   ├── login.ts, signup.ts, googleAuth.ts
│   │   ├── getuser.ts, editUser.ts
│   └── interestService/
│       ├── getCategories.ts, getInterests.ts
│       └── userService/
│           ├── changeUserInterests.ts
│           └── getUserInterests.ts
├── Hooks/
│   ├── useTasks.ts
│   ├── useTasksForSpecificDay.ts
│   ├── useLogin.ts
│   ├── useLogout.ts
│   └── useTheme.ts
├── navigation/
│   ├── Root.tsx         App orchestrator
│   ├── AppNavigator.tsx
│   └── AuthNavigator.tsx
├── screens/            (see §10)
├── components/         (see §11)
├── types/
│   ├── task.ts          Task, TaskRepetition, TaskCompletion + date helpers
│   ├── user.ts
│   ├── category.ts
│   ├── interests.ts
│   └── friend.ts
├── constants/
│   ├── colors.ts        Light/dark theme tokens
│   └── taskConstants.ts Priorities, repetition options, emoji sets
├── utils/
│   ├── validateForm.ts
│   └── storage/
│       ├── auth.ts       saveData, getData, patchData, clearData
│       └── localStorage.ts  Keychain get/set/remove wrappers
└── assets/
```

---

## 2. Persistence — SQLite Schema

Engine: `@op-engineering/op-sqlite` (synchronous native bridge).  
Initialised on first `getDatabase()` call. Singleton instance.

### Domain Tables

```sql
CREATE TABLE categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE tasks (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      INTEGER NOT NULL,
  title        TEXT NOT NULL,
  reminderTime INTEGER,
  startTime    TEXT NOT NULL,
  endTime      TEXT,
  priority     TEXT CHECK(priority IN ('low','medium','high','none')) DEFAULT 'none',
  emoji        TEXT,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE(task_id, category_id)
);

CREATE TABLE task_repetitions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id   TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK(frequency IN (
    'once','daily','weekly','monthly','yearly',
    'sunday','monday','tuesday','wednesday','thursday','friday','saturday'
  )),
  time TEXT
);

CREATE TABLE task_completions (
  id              TEXT PRIMARY KEY,
  task_id         TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completion_time TEXT NOT NULL,
  date            TEXT NOT NULL
);
```

### Infrastructure Table

```sql
CREATE TABLE sync_queue (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  type      TEXT NOT NULL CHECK(type IN ('create','update','delete','complete','uncomplete')),
  task_id   TEXT,
  data      TEXT,
  timestamp INTEGER NOT NULL,
  retries   INTEGER NOT NULL DEFAULT 0
);
```

### Indexes

| Index | Table.Column |
|-------|--------------|
| `idx_tasks_user_id` | `tasks.user_id` |
| `idx_task_categories_task_id` | `task_categories.task_id` |
| `idx_task_repetitions_task_id` | `task_repetitions.task_id` |
| `idx_task_completions_task_id` | `task_completions.task_id` |
| `idx_task_completions_date` | `task_completions.date` |
| `idx_sync_queue_task_id` | `sync_queue.task_id` |

### Lifecycle

| Function | Purpose |
|----------|---------|
| `getDatabase()` | Open (or return cached) DB instance; run `initializeTables` |
| `closeDatabase()` | Close instance, null reference |
| `dropAllTables()` | Drop all → re-run `initializeTables` |

---

## 3. Persistence — Repository API

All mutations use explicit `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`.

### Task CRUD

| Function | Description |
|----------|-------------|
| `createTask(task)` | Auto-ID insert; task + categories + repetitions in one transaction |
| `createTaskWithId(id, task)` | Same as above with a specific ID (used by sync) |
| `getTaskById(id)` | Joins task + categories + repetitions + completions |
| `getTasksByUserId(userId)` | All tasks ordered by `startTime DESC` |
| `getTasksByDateRange(userId, start, end)` | Tasks within `startTime` window |
| `searchTasksByTitle(userId, query)` | `LIKE` search |
| `updateTask(id, updates)` | Partial update; replaces categories/repetitions if provided |
| `deleteTask(id)` | Single delete (FK cascades handle related rows) |
| `deleteTasksByUserId(userId)` | Explicitly deletes completions, categories, repetitions, then tasks |
| `clearAllTaskData()` | Wipes all domain tables |

### Category

| Function | Description |
|----------|-------------|
| `ensureCategoryExists(name, id)` | Find by name or insert with given ID |
| `getAllCategories()` | Full list ordered by name |

### Completion CRUD

| Function | Description |
|----------|-------------|
| `addTaskCompletion(completion)` | `INSERT OR REPLACE` |
| `removeTaskCompletionById(id)` | Delete by PK |
| `removeTaskCompletionByDate(taskId, date)` | Delete by `(task_id, date)` |
| `getTaskCompletions(taskId)` | All completions for task, ordered by date |
| `clearTaskCompletions(taskId)` | Remove all for task |

---

## 4. Persistence — Secure Storage

Backend: `react-native-keychain`. Single JSON blob stored under key `"appData"`.

```
Keychain → "appData" (JSON string)
  ├── token   string   DRF auth token
  ├── id      number   User ID
  └── user    User     Full user object (offline fallback)
```

### Auth Helpers (`utils/storage/auth.ts`)

| Function | Description |
|----------|-------------|
| `saveData(data)` | Write full `AuthData` |
| `getData()` | Read `AuthData` or `null` |
| `patchData(patch)` | Merge partial update into existing |
| `clearData()` | Remove auth entry |

### Generic Helpers (`utils/storage/localStorage.ts`)

| Function | Description |
|----------|-------------|
| `getStorageItem(key)` | Read any key from JSON blob |
| `setStorageItem(key, value)` | Write any key |
| `removeStorageItem(key)` | Delete key |
| `clearStorage()` | `Keychain.resetGenericPassword()` |

---

## 5. Sync Queue — Implementation

### Queue Entry Shape

```typescript
type SyncQueueItem = {
  id: number;
  type: 'create' | 'update' | 'delete' | 'complete' | 'uncomplete';
  task_id: string | null;
  data: any | null;       // parsed from JSON
  timestamp: number;
  retries: number;
};
```

### Queue Helpers

| Function | Description |
|----------|-------------|
| `addToSyncQueue({ type, taskId, data })` | Generic insert |
| `queueCreateTask(taskId, payload)` | Shorthand for `type: 'create'` |
| `queueUpdateTask(taskId, payload)` | Shorthand for `type: 'update'` |
| `queueDeleteTask(taskId)` | Shorthand for `type: 'delete'` (no data) |
| `queueCompleteTask(taskId, { completion_time, date })` | Shorthand for `type: 'complete'` |
| `queueUncompleteTask(taskId, { date })` | Shorthand for `type: 'uncomplete'` |
| `getPendingSyncItems(limit?)` | Read all, ordered by `timestamp ASC` |
| `removeSyncItem(id)` | Delete by PK |
| `incrementSyncItemRetries(id)` | `retries += 1` |
| `deleteSyncItemsForTask(taskId)` | Remove all entries for a task |
| `clearSyncQueue()` | Wipe table |

### Queue Drain (`applyQueue`)

```
applyQueue()
  ├─ Mutex: isApplyingQueue flag (skip if already running)
  ├─ Guard: isOnline() && token exists
  ├─ getPendingSyncItems()
  ├─ idMap = Map<string, string>()     ← local→backend remapping
  │
  ├─ For each item (timestamp order):
  │   ├─ retries >= MAX_RETRIES (5) → removeSyncItem, skip
  │   ├─ resolvedTaskId = idMap.get(task_id) ?? task_id
  │   │
  │   ├─ CREATE:
  │   │   ├─ TaskAPI.createTask(data) → backendId
  │   │   ├─ idMap.set(localId, backendId)
  │   │   ├─ deleteLocalTask(localId)
  │   │   ├─ createTaskWithId(backendId, data)
  │   │   └─ removeSyncItem
  │   │
  │   ├─ UPDATE:
  │   │   ├─ TaskAPI.updateTask(resolvedId, data)
  │   │   ├─ If remapped → updateLocalTask(resolvedId, data)
  │   │   └─ removeSyncItem
  │   │
  │   ├─ DELETE:
  │   │   ├─ Skip API if isLocalId (never reached backend)
  │   │   ├─ TaskAPI.deleteTask(resolvedId)
  │   │   └─ removeSyncItem
  │   │
  │   ├─ COMPLETE:
  │   │   ├─ Skip API if isLocalId
  │   │   ├─ TaskAPI.completeTask(resolvedId, completion_time)
  │   │   └─ removeSyncItem
  │   │
  │   └─ UNCOMPLETE:
  │       ├─ Skip API if isLocalId
  │       ├─ TaskAPI.uncompleteTask(resolvedId, { date })
  │       └─ removeSyncItem
  │
  │   On error → incrementSyncItemRetries
  │
  └─ finally: isApplyingQueue = false
```

### Full Sync (`syncBackend`)

```
syncBackend()
  ├─ Guard: online + userId
  ├─ clearAllTaskData() + clearSyncQueue()
  ├─ Fetch categories → ensureCategoryExists for each
  ├─ Paginate TaskAPI.getTasks (page_size: 100)
  │   For each task:
  │     ├─ createTaskWithId(task.id, task)
  │     └─ TaskAPI.historyTask(task.id) → addLocalCompletion for each
  └─ Loop until response.next === null
```

---

## 6. Sync Service — Operation Table

All screen/hook code routes through `syncService.ts`. Never calls API or DB directly.

| Function | Online | Offline |
|----------|--------|---------|
| `addTask(task)` | API create → `createTaskWithId(backendId)` | `createTaskWithId(local_id)` → `queueCreateTask` |
| `getTask(id)` | SQLite read | SQLite read |
| `getTasks(userId)` | SQLite read | SQLite read |
| `getTasksByDateRange(…)` | SQLite read | SQLite read |
| `searchTasksByTitle(…)` | SQLite read | SQLite read |
| `getCategories()` | API call | `getAllCategories()` from SQLite |
| `updateTask(id, updates)` | SQLite → API push | SQLite → `queueUpdateTask` |
| `deleteTask(id)` | SQLite → API delete → `deleteSyncItemsForTask` | SQLite → `queueDeleteTask` (or discard if `local_`) |
| `completeTask(id, date)` | SQLite → API → replace local completion with backend ID | SQLite → `queueCompleteTask` |
| `uncompleteTask(id, date)` | SQLite → API | SQLite → `queueUncompleteTask` |
| `fullSyncTasks()` | `applyQueue()` → `syncBackend()` | No-op |

---

## 7. Redux Slices

### `userSlice`

| Item | Detail |
|------|--------|
| State | `{ data: User \| null, loading: boolean, error: string \| null }` |
| Thunk | `fetchUser` — `getData()` from Keychain → `getUser({ id })` → `saveData()` back to Keychain |
| Reducers | `setUser(User)`, `clearUser()` |
| Selector | `selectUser(state)` |

### `networkSlice`

| Item | Detail |
|------|--------|
| State | `{ isConnected: boolean, loading: boolean, error: string \| null }` |
| Thunk | `checkInternetConnectivity(isNetworkConnected)` — if connected, pings `https://8.8.8.8` (`HEAD`, `no-cors`) |
| Reducers | `setNetworkStatus(boolean)` |

### `tasksSlice`

| Item | Detail |
|------|--------|
| State | `{ items: SerializedTask[], loading: boolean, error: string \| null }` |
| Reducers | `setTasks(SerializedTask[])`, `upsertTask(SerializedTask)`, `removeTask(id)`, `clearTasks()`, `setLoading(boolean)`, `setError(string \| null)` |

### Serialization

```typescript
// SerializedTask: dates as strings for Redux serializability
type SerializedTask = Omit<Task, 'startTime' | 'endTime' | 'repetition' | 'completions'> & {
  startTime: string;
  endTime: string | null;
  repetition: Array<Omit<TaskRepetition, 'time'> & { time: string | null }>;
  completions: SerializedTaskCompletion[];
};
```

Conversion in `useTasks`: `toSerializableTask()` / `fromSerializableTask()`.

---

## 8. Service Layer — API Clients

### HTTP Client (`api.ts`)

```typescript
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use(async config => {
  const data = await getData();
  if (data?.token) config.headers.Authorization = `token ${data.token}`;
  return config;
});
```

### Task API (`TaskService/tasks.ts`)

| Endpoint | Function | Notes |
|----------|----------|-------|
| `POST /task/` | `createTask(taskData)` | Maps camelCase → snake_case; returns `Task` |
| `GET /task/` | `getTasks({ page, page_size, priority, category, ordering })` | Paginated; resolves category IDs to objects |
| `GET /task/:id` | `getTaskById(id)` | |
| `PUT /task/:id` | `updateTask(id, taskData)` | Full replace |
| `PATCH /task/:id` | `patchTask(id, partial)` | Partial update |
| `DELETE /task/:id` | `deleteTask(id)` | |
| `POST /task/:id/complete` | `completeTask(id, completion_time)` | Sends `toLocalDateString` |
| `POST /task/:id/uncomplete` | `uncompleteTask(id, { id?, date? })` | By completion ID or date |
| `GET /task/:id/history` | `historyTask(id)` | Returns `TaskCompletion[]` |

### Auth Services

| File | Function | Description |
|------|----------|-------------|
| `login.ts` | — | Email/password POST |
| `signup.ts` | — | Registration POST |
| `googleAuth.ts` | — | Google OAuth token exchange |
| `getuser.ts` | `getUser({ id })` | `GET /user/:id` → `{ success, user }` |
| `editUser.ts` | — | `PATCH /user/:id` |

### Interest Services

| File | Function |
|------|----------|
| `getCategories.ts` | `getCategories()` → `Category[]` |
| `getInterests.ts` | `getInterests()` → interest list |
| `userService/changeUserInterests.ts` | Update user's interests |
| `userService/getUserInterests.ts` | Read user's interests |

---

## 9. Hook Contracts

### `useTasks(userId: number | null)`

Loads all tasks from SQLite on mount; keeps Redux in sync.

| Return | Type | Description |
|--------|------|-------------|
| `tasks` | `Task[]` | Deserialized from Redux |
| `loading` | `boolean` | |
| `error` | `string \| null` | |
| `createTask` | `(task: Omit<Task, 'id'>) => Promise<Task>` | Via `syncService.addTask` |
| `updateTask` | `(id: string, updates: Partial<Task>) => Promise<void>` | |
| `deleteTask` | `(id: string) => Promise<void>` | |
| `completeTask` | `(id: string, date: Date) => Promise<void>` | |
| `uncompleteTask` | `(id: string, date: Date) => Promise<void>` | |
| `refresh` | `() => Promise<void>` | Re-load from SQLite |

### `useTasksForSpecificDay(userId: number | null, date: Date)`

Filters `useTasks` by date. Memoised on `toLocalDateString(date)`.

| Return | Type | Description |
|--------|------|-------------|
| `tasks` | `Task[]` | Tasks on this date |
| `allTasks` | `Task[]` | Unfiltered |
| `pendingTasks` | `Task[]` | Not completed for date |
| `completedTasks` | `Task[]` | Completed for date |
| `canComplete` | `boolean` | `false` if date is in the future |
| `toggleComplete` | `(taskId: string) => Promise<void>` | Complete or uncomplete |

### `useLogin()`

Returns `(data: { token: string, id: number }) => Promise<void>`:  
`saveData` → `dropAllTables` → `fullSyncTasks` → `fetchUser`

### `useLogout()`

Returns `() => Promise<void>`:  
`clearData` → `clearUser` → `clearTasks` → `dropAllTables`

### `useTheme()`

Returns `{ theme: ColorSchemeName, colors: AppColors }`.  
Subscribes to `Appearance.addChangeListener`.

---

## 10. Navigation — Route Map

### Auth Stack (`AuthNavigator`)

| Route | Component | File |
|-------|-----------|------|
| `SignUp` | `SignUp` | `screens/SignUp/signUp.tsx` |
| `Login` | `Login` | `screens/Login/login.tsx` |

### App Stack (`AppNavigator`)

| Route | Component | File | Params |
|-------|-----------|------|--------|
| `Home` | `HomeScreen` | `screens/Home/HomeScreen.tsx` | — |
| `Intro` | `IntroNavigator` | `screens/PermissionsIntro/IntroNavigator.tsx` | — |
| `Profile` | `ProfileScreen` | `screens/ProfileScreen/ProfileScreen.tsx` | — |
| `EditProfile` | `EditProfileScreen` | `screens/ProfileScreen/editProfile/EditProfile.tsx` | — |
| `Schedule` | `ScheduleScreen` | `screens/Schedule/ScheduleScreen.tsx` | — |
| `Timer` | `TimerScreen` | `screens/Timer/TimerScreen.tsx` | — |
| `Friends` | `FriendsListScreen` | `screens/Friends/FriendsListScreen.tsx` | — |
| `AddFriend` | `AddFriendScreen` | `screens/Friends/AddFriendScreen.tsx` | — |
| `BlockedFriends` | `BlockedListScreen` | `screens/Friends/BlockedListScreen.tsx` | — |
| `Tasks` | `TasksScreen` | `screens/Tasks/TasksScreen.tsx` | — |
| `AddTask` | `AddTaskScreen` | `screens/Tasks/AddTaskScreen.tsx` | — |
| `EditTask` | `EditTaskScreen` | `screens/Tasks/EditTaskScreen.tsx` | `{ task: any }` |
| `Settings` | `SettingsScreen` | `screens/Settings/SettingsScreen.tsx` | — |

All screens use `headerShown: false`. Floating `AiButton` overlays.

### Type Params

```typescript
type AppStackParamList = {
  Home: undefined;
  Intro: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Schedule: undefined;
  Timer: undefined;
  Friends: undefined;
  Tasks: undefined;
  AddTask: undefined;
  EditTask: { task: any };
  AddFriend: undefined;
  BlockedFriends: undefined;
  Settings: undefined;
};

type AuthStackParamList = {
  SignUp: undefined;
  Login: undefined;
};
```

---

## 11. Component Inventory

### Layout

| Component | File | Description |
|-----------|------|-------------|
| `BottomBar` | `components/BottomBar/BottomBar.tsx` | Emoji tab bar (Tasks, Friends, Home, Timer, Settings) |
| `OfflineBar` | `components/OfflineBar/offlineBar.tsx` | Red "You're offline" banner; reads `network.isConnected` |
| `AiButton` | `components/AiBottom/AiButtom.tsx` | Draggable floating button (`PanGestureHandler`) |

### Task

| Component | File | Description |
|-----------|------|-------------|
| `TaskCard` | `components/Task/TaskCard.tsx` | Full + compact variants; priority color coding, repetition badges, completion toggle |
| `Schedule` | `components/Schedule/Schedule.tsx` | Calendar with month picker, day selector, task cards, complete toggle, detail modal |

### Timer

| Component | File | Description |
|-----------|------|-------------|
| `TimerDial` | `components/Timer/TimerDial.tsx` | SVG circular progress with streak display |
| `CountdownText` | `components/Timer/CountdownText.tsx` | MM:SS formatter |
| `TaskSelector` | `components/Timer/TaskSelector.tsx` | Pick task for focus session |
| `StartButton` | `components/Timer/StartButton.tsx` | Start timer action |
| `GiveUpButton` | `components/Timer/GiveUpButton.tsx` | Quit timer action |
| `GiveUpDialog` | `components/Timer/GiveUpDialog.tsx` | Modal confirmation |

### Social

| Component | File | Description |
|-----------|------|-------------|
| `FriendItem` | `components/Friends/FriendItem.tsx` | Context menu: remove / block |
| `BlockedItem` | `components/Friends/BlockedItem.tsx` | Unblock action |
| `UserSearchItem` | `components/Friends/UserSearchItem.tsx` | Send friend request |

### Settings

| Component | File | Description |
|-----------|------|-------------|
| `SettingsSection` | `components/Settings/SettingsSection.tsx` | Group container |
| `SettingsNavItem` | `components/Settings/SettingsNavItem.tsx` | Navigation row |
| `SettingsSwitchItem` | `components/Settings/SettingsSwitchItem.tsx` | Toggle switch |
| `SettingsSelectItem` | `components/Settings/SettingsSelectItem.tsx` | Cycle-through selector |
| `LogoutButton` | `components/Settings/LogoutButton.tsx` | Logout action |

### Auth

| Component | File | Description |
|-----------|------|-------------|
| `LoginGoogle` | `components/loginGoogle/loginGoogle.tsx` | Google Sign-In button with loading state |

---

## 12. Type Definitions

### `Task` (`types/task.ts`)

```typescript
type Task = {
  id: string;
  user_id: number;
  title: string;
  Categorys: Category[];
  completions: TaskCompletion[];
  reminderTime: number | null;
  startTime: Date;
  endTime: Date | null;
  priority: 'low' | 'medium' | 'high' | 'none';
  repetition: TaskRepetition[];
  emoji: string;
};

type TaskRepetition = {
  frequency: RepetitionFrequency;
  time: Date | null;
};

type TaskCompletion = {
  id: string;
  task_id: string;
  completion_time: Date;
  date: Date;
};

type RepetitionFrequency =
  | 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  | 'sunday' | 'monday' | 'tuesday' | 'wednesday'
  | 'thursday' | 'friday' | 'saturday';
```

### Date Logic Functions (`types/task.ts`)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `toLocalDateString` | `(d: Date) → string` | `YYYY-MM-DD` in local time |
| `isTaskOnDate` | `(task, date) → boolean` | Repetition rules + completion fallback |
| `isTaskScheduledOnDate` | `(task, date) → boolean` | Pure schedule (ignores completions) |
| `isTaskCompletedForDate` | `(task, date) → boolean` | Sparse lookup by date string |
| `canCompleteForDate` | `(date) → boolean` | `target <= today` |
| `getCompletionForDate` | `(task, date) → TaskCompletion \| undefined` | Find record |

### `User` (`types/user.ts`)

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

### Other Types

```typescript
// types/category.ts
type Category = { id: number; name: string };

// types/friend.ts
type Friend = { id: string; name: string; avatar: string; status?: 'active' | 'offline' };
type FriendRequest = { id: string; name: string; avatar: string; requestStatus: 'pending' | 'sent' };
```

---

## 13. Theming Tokens

System-aware light/dark via `Appearance` API. Consumed through `useTheme()`.

### Color Map (`constants/colors.ts`)

| Token | Type | Light | Dark |
|-------|------|-------|------|
| `background` | Page bg | `#F9FAFB` | `#0F172A` |
| `surface` | Card bg | `#FFFFFF` | `#1E293B` |
| `primary` | Brand accent | `#2563EB` | `#3B82F6` |
| `primaryText` | Text on primary | `#FFFFFF` | `#FFFFFF` |
| `text` | Primary text | `#111827` | `#F9FAFB` |
| `secondaryText` | Muted text | `#6B7280` | `#9CA3AF` |
| `border` | Borders | `#D1D5DB` | `#4B5563` |
| `error` | Error states | `#EF4444` | `#F97373` |
| `divider` | Separators | `#D1D5DB` | `#4B5563` |
| `buttonDanger` | Destructive | `#ff6b6b` | `#f97373` |

### Task Constants (`constants/taskConstants.ts`)

```typescript
PRIORITIES: ['low', 'medium', 'high', 'none']
DEFAULT_REMINDERS: [5, 10, 15, 30, 60]          // minutes
REPETITION_BASE_OPTIONS: ['once', 'daily', 'weekly', 'monthly', 'yearly']
WEEKDAY_OPTIONS: ['sunday', …, 'saturday']
EMOJI_CATEGORIES: [{ id, label, emojis[] }, …]   // work, fitness, study, shopping, focus
```
