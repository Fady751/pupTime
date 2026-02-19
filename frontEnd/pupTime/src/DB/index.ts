// Database core
export { getDatabase, closeDatabase, dropAllTables } from './database';

// Task repository
export {
  createTask,
  createTaskWithId,
  getTaskById,
  getTasksByUserId,
  getTasksByStatus,
  updateTask,
  deleteTask,
  deleteTasksByUserId,
  clearAllTaskData,
  getAllCategories,
  searchTasksByTitle,
  getTasksByDateRange,
} from './taskRepository';

// Sync queue
export {
  addToSyncQueue,
  queueCreateTask,
  queueUpdateTask,
  queueDeleteTask,
  getPendingSyncItems,
  removeSyncItem,
  clearSyncQueue,
  incrementSyncItemRetries,
  deleteSyncItemsForTask,
} from './sync_queue';
