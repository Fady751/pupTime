// Database core
export { getDatabase, closeDatabase, dropAllTables } from './database';

// Task repository
export {
  createTask,
  createTaskWithId,
  getTaskById,
  getTasksByUserId,
  updateTask,
  deleteTask,
  deleteTasksByUserId,
  clearAllTaskData,
  getAllCategories,
  searchTasksByTitle,
  getTasksByDateRange,
  addTaskCompletion,
  removeTaskCompletionById,
  removeTaskCompletionByDate,
  getTaskCompletions,
  clearTaskCompletions,
} from './taskRepository';

// Sync queue
export {
  addToSyncQueue,
  queueCreateTask,
  queueUpdateTask,
  queueDeleteTask,
  queueCompleteTask,
  queueUncompleteTask,
  getPendingSyncItems,
  removeSyncItem,
  clearSyncQueue,
  incrementSyncItemRetries,
  deleteSyncItemsForTask,
  updateIDInSyncQueue,
} from './sync_queue';
