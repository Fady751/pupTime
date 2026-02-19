import { store } from '../../redux/store';
import { Task } from '../../types/task';
import uuid from 'react-native-uuid';

// Backend API services
import * as TaskAPI from './tasks';
import { getCategories as getCategoriesAPI } from '../interestService/getCategories';

// Local DB operations
import {
  createTaskWithId,
  getTaskById as getLocalTaskById,
  getTasksByUserId as getLocalTasksByUserId,
  getTasksByStatus as getLocalTasksByStatus,
  getTasksByDateRange as getLocalTasksByDateRange,
  searchTasksByTitle as searchLocalTasksByTitle,
  updateTask as updateLocalTask,
  deleteTask as deleteLocalTask,
  clearAllTaskData,
} from '../../DB';

// Sync queue operations
import {
  getPendingSyncItems,
  removeSyncItem,
  incrementSyncItemRetries,
  clearSyncQueue,
  queueCreateTask,
  queueUpdateTask,
  queueDeleteTask,
  deleteSyncItemsForTask,
} from '../../DB/sync_queue';
import { getData } from '../../utils/storage/auth';
import { ensureCategoryExists, getAllCategories } from '../../DB/taskRepository';
import { Category } from '../../types/category';

const MAX_RETRIES = 5;
const LOCAL_ID_PREFIX = 'local_';

// ── Helpers ──────────────────────────────────────────────

const isOnline = (): boolean => {
  return store.getState().network.isConnected && !store.getState().network.loading;
};

/** Generate a local ID for tasks created while offline */
const generateLocalId = (): string => {
  return `${LOCAL_ID_PREFIX}${uuid.v4()}`;
};

const isLocalId = (id: string): boolean => id.startsWith(LOCAL_ID_PREFIX);

/**
 * JSON round-tripping turns Date objects into strings.
 * Reconstruct them so the backend API helpers (which call .toISOString()) work.
 */
const reconstructTaskDates = (data: any): Task => {
  return {
    ...data,
    startTime: data.startTime instanceof Date ? data.startTime : new Date(data.startTime),
    endTime: data.endTime
      ? data.endTime instanceof Date
        ? data.endTime
        : new Date(data.endTime)
      : null,
    repetition: (data.repetition || []).map((rep: any) => ({
      ...rep,
      time: rep.time
        ? rep.time instanceof Date
          ? rep.time
          : new Date(rep.time)
        : null,
    })),
  };
};

// ── 1. Apply Queue ───────────────────────────────────────
/**
 * Push every pending queue operation to the backend.
 * Maintains a local→backend ID map so that items queued against a
 * locally-created task get the correct backend ID.
 */
const applyQueue = async (): Promise<void> => {
  if (!isOnline()) {
    console.warn('[Sync] Offline – skipping queue apply');
    return;
  }
  console.log('[Sync] Applying queue items...');
  
  const token = (await getData())?.token;
  if (!token) {
      console.warn('[Sync] No token – skipping queue apply');
      return;
  }

  const items = await getPendingSyncItems();
  if (items.length === 0) return;

  // Track local ID → backend ID re-mappings produced by "create" items
  const idMap = new Map<string, string>();

  for (const item of items) {
    if (item.retries >= MAX_RETRIES) {
      console.warn(`[Sync] Dropping item ${item.id} – max retries (${MAX_RETRIES}) reached`);
      await removeSyncItem(item.id);
      continue;
    }

    try {
      // If a previous create remapped this task's ID, use the new one
      const resolvedTaskId = item.task_id
        ? idMap.get(item.task_id) ?? item.task_id
        : null;

      switch (item.type) {
        // ─── CREATE ───────────────────────────────
        case 'create': {
          const taskData = reconstructTaskDates(item.data);

          // Send to backend
          const backendTask = await TaskAPI.createTask(taskData);
          const backendId = backendTask.id.toString();
          const localId = item.task_id!;

          // Remember the mapping
          idMap.set(localId, backendId);

          // Replace local row with the real backend ID
          await deleteLocalTask(localId);
          await createTaskWithId(backendId, taskData);

          await removeSyncItem(item.id);
          break;
        }

        // ─── UPDATE ───────────────────────────────
        case 'update': {
          if (!resolvedTaskId) {
            console.warn('[Sync] Update item has no task_id – removing');
            await removeSyncItem(item.id);
            break;
          }

          const updateData = reconstructTaskDates(item.data);
          await TaskAPI.updateTask(resolvedTaskId, updateData);

          // If the ID was remapped (offline-created task), update local row too
          if (resolvedTaskId !== item.task_id) {
            await updateLocalTask(resolvedTaskId, updateData);
          }

          await removeSyncItem(item.id);
          break;
        }

        // ─── DELETE ───────────────────────────────
        case 'delete': {
          if (!resolvedTaskId) {
            console.warn('[Sync] Delete item has no task_id – removing');
            await removeSyncItem(item.id);
            break;
          }

          // Only hit the backend if the task once had a real backend ID
          if (!isLocalId(resolvedTaskId)) {
            await TaskAPI.deleteTask(resolvedTaskId);
          }

          await removeSyncItem(item.id);
          break;
        }
      }
    } catch (error) {
      console.error(`[Sync] Error processing queue item ${item.id}:`, error);
      await incrementSyncItemRetries(item.id);
    }
  }
};

// ── 2. Sync Backend (refresh) ────────────────────────────
/**
 * Wipe local task tables and re-fetch everything from the backend.
 */
const syncBackend = async (): Promise<void> => {
  if (!isOnline()) {
    console.warn('[Sync] Offline – skipping backend sync');
    return;
  }
  console.log('[Sync] Starting backend sync...');

  const userId = (await getData())?.id;
  if (!userId) {
    console.warn('[Sync] No user – skipping backend sync');
    return;
  }

  // Clear all local task data
  await clearAllTaskData();
  await clearSyncQueue();

  const categories = await getCategories();

  for (const category of categories) {
    await ensureCategoryExists(category.name, category.id);
  }


  // Paginate through all backend tasks
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await TaskAPI.getTasks({ page, page_size: 100 });

    for (const task of response.results) {
      await createTaskWithId(task.id, task);
    }

    hasMore = response.next !== null;
    page++;
  }
};

// ── 3. Full Sync ─────────────────────────────────────────
/**
 * Apply all pending queue items, then refresh from backend.
 */
const sync = async (): Promise<void> => {
  await applyQueue();
  await syncBackend();
};

// ── 4. Add Task ──────────────────────────────────────────
/**
 * Online  → create on backend → store with backend ID in SQLite
 * Offline → store with local ID in SQLite → queue a "create"
 */
const addTask = async (task: Omit<Task, 'id'>): Promise<Task> => {
  const userId = (await getData())?.id;
  if (userId) {
    (task as any).user_id = userId;
  }

  if (isOnline()) {
    try {
      const backendTask = await TaskAPI.createTask(task as Task);
      const backendId = backendTask.id.toString();

      await createTaskWithId(backendId, task);

      const localTask = await getLocalTaskById(backendId);
      return localTask!;
    } catch (error) {
      console.error('[Sync] Online create failed, falling back to offline:', error);
      // Fall through to offline path
    }
  }

  // Offline (or online-failed) path
  const localId = generateLocalId();
  await createTaskWithId(localId, task);
  await queueCreateTask(localId, task);

  const localTask = await getLocalTaskById(localId);
  return localTask!;
};

// ── 5. Read Task(s) – always from SQLite ─────────────────

const getTask = async (taskId: string): Promise<Task | null> => {
  return getLocalTaskById(taskId);
};

const getTasks = async (userId: number): Promise<Task[]> => {
  return getLocalTasksByUserId(userId);
};

const getTasksByStatus = async (
  userId: number,
  status: 'pending' | 'completed',
): Promise<Task[]> => {
  return getLocalTasksByStatus(userId, status);
};

const getTasksByDateRange = async (
  userId: number,
  startDate: Date,
  endDate: Date,
): Promise<Task[]> => {
  return getLocalTasksByDateRange(userId, startDate, endDate);
};

const searchTasksByTitle = async (
  userId: number,
  query: string,
): Promise<Task[]> => {
  return searchLocalTasksByTitle(userId, query);
};

const getCategories = async (): Promise<Category[]> => {
    if(!isOnline()) {
        return await getAllCategories();
    }
    try {
        const categories = getCategoriesAPI();
        return categories;
    } catch (error) {
        console.error('[Sync] Failed to fetch categories:', error);
        throw error;
    }
};


// ── 6. Update Task ───────────────────────────────────────
/**
 * Always update locally first (instant UI feedback).
 * Online  → push update to backend
 * Offline → queue the update
 */
const updateTask = async (
  taskId: string,
  updates: Partial<Task>,
): Promise<void> => {
  // Update locally first for instant feedback
  console.log("Updating task locally:", taskId, updates);
  await updateLocalTask(taskId, updates);

  if (isOnline() && !isLocalId(taskId)) {
    try {
      const fullTask = await getLocalTaskById(taskId);
      if (fullTask) {
        await TaskAPI.updateTask(taskId, fullTask);
      }
      return;
    } catch (error) {
      console.error('[Sync] Online update failed, queuing:', error);
    }
  }

  // Offline or failed: queue the full current state of the task
  const fullTask = await getLocalTaskById(taskId);
  if (fullTask) {
    await queueUpdateTask(taskId, fullTask);
  }
};

// ── 7. Delete Task ───────────────────────────────────────
/**
 * Always delete locally first (instant UI feedback).
 * Online  → delete on backend
 * Offline → queue the delete (unless it was never synced)
 */
const deleteTask = async (taskId: string): Promise<void> => {
  // Delete locally first
  await deleteLocalTask(taskId);

  if (isOnline() && !isLocalId(taskId)) {
    try {
      await TaskAPI.deleteTask(taskId);
      await deleteSyncItemsForTask(taskId);
      return;
    } catch (error) {
      console.error('[Sync] Online delete failed, queuing:', error);
    }
  }

  if (isLocalId(taskId)) {
    // Task never reached the backend – just discard all queue entries for it
    await deleteSyncItemsForTask(taskId);
  } else {
    // Real backend task – queue the delete
    await queueDeleteTask(taskId);
  }
};

export {
    // Sync operations
    applyQueue,
    syncBackend,
    sync as fullSyncTasks,
    // create
    addTask,
    // Read operations are always from local DB for speed and offline access
    getTask,
    getTasks,
    getTasksByStatus,
    getTasksByDateRange,
    searchTasksByTitle,
    getCategories,
    // Update
    updateTask,
    // Delete
    deleteTask
};
