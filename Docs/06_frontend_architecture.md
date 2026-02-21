# Frontend Architecture

Concise architectural reference for the PupTime React Native client.

This document describes:
- Architectural boundaries
- Data flow
- Offline sync engine
- State management strategy
- Navigation structure

Implementation details live in:
→ 06a_frontend_implementation.md

---

## 1. Core Principles

1. Offline-first architecture  
2. SQLite = single local source of truth  
3. Redux = view cache only  
4. All writes go through syncService  
5. UI layer contains no business logic  
6. Backend is final authority for validation  

Stack:
React Native 0.83 · TypeScript · Redux Toolkit · op-sqlite · Axios · React Navigation · Keychain

---

## 2. Layered Architecture

UI Layer  
→ Screens · Components · Navigation  

Hook Layer  
→ useTasks · useAuth · useNetwork  

Service Layer  
→ syncService  
   ├─ taskRepository (SQLite CRUD)  
   └─ API clients (Axios)  

Persistence Layer  
→ SQLite DB  
→ sync_queue table  
→ Keychain (secure auth storage)

Rule:
Screens → Hooks → syncService → SQLite first → API second  
Nothing bypasses this chain.

---

## 3. App Boot Flow

index.js  
→ App.tsx  
→ Root.tsx  

Startup sequence:

1. Check real connectivity (NetInfo + ping)
2. If online:
   - fetchUser() from backend
   - cache to Keychain
3. If offline:
   - load user from Keychain
4. applyQueue() to flush pending operations
5. Render navigator based on auth state

---

## 4. Authentication Lifecycle

Login:
- Save token to Keychain
- Drop local SQLite
- fullSyncTasks()
- fetchUser()

Logout:
- Clear Keychain
- Clear Redux
- Drop SQLite

Reconnect:
- applyQueue() drains sync_queue

---

## 5. Offline Sync Engine

### Write Flow

User action
→ Write to SQLite immediately
→ If online → attempt API call
→ If fail or offline → enqueue operation

### sync_queue Table

Fields:
- id
- type (create | update | delete | complete | uncomplete)
- task_id
- payload (JSON)
- retries (max 5)
- timestamp

Processed FIFO on reconnect.

### Local ID Strategy

Offline-created tasks:
- id = local_<uuid>

On successful backend create:
- Receive backend id
- Replace local row
- Remap queued operations via in-memory idMap

---

## 6. Full Sync Strategy

Triggered on login:

1. Drain queue
2. Wipe local DB
3. Fetch all tasks + completions
4. Rebuild SQLite

Guarantees consistency after re-authentication.

---

## 7. State Management

Redux Store:

userSlice  
networkSlice  
tasksSlice  

Rules:

- Redux stores serialized data only
- SQLite persists actual state
- Tasks are loaded from SQLite via hooks
- No async logic inside reducers

Serialization boundary:
Date objects → ISO strings → deserialized in hooks

---

## 8. Navigation

AuthStack:
- Login
- SignUp

AppStack:
- Home
- Tasks
- AddTask
- EditTask
- Schedule
- Timer
- Friends
- Profile
- Settings

Navigator is swapped in Root.tsx based on user state.

---

## 9. Architectural Constraints

1. Screens never call API directly
2. Screens never access SQLite directly
3. All data mutations go through syncService
4. SQLite is the local source of truth
5. Backend validates everything
6. Keychain only for secrets (no AsyncStorage)
7. Dates stored as local YYYY-MM-DD (avoid UTC shift)

---

## 10. AI Layer (Future Scope)

Frontend responsibility:
User input → send to backend → render response

Frontend does NOT:
- Parse raw AI JSON
- Make scheduling decisions
- Modify tasks without backend confirmation