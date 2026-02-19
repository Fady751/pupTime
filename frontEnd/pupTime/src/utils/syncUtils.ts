import {
  getSyncQueue,
  addSyncOperation,
  updateSyncOperationRetries,
  removeSyncOperation as removeSyncOperationDb,
  clearSyncQueue,
  getLastSyncTime as getLastSyncTimeDb,
  updateLastSyncTime as updateLastSyncTimeDb,
  getPendingSyncCount,
} from '../DB/syncRepository';

export type SyncOperation = {
  id: string;
  type: 'create' | 'update' | 'delete';
  taskId?: number;
  data?: any;
  timestamp: number;
  retries: number;
};

/**
 * Sync Queue Manager
 * Handles offline operations and retrying failed syncs
 */
class SyncQueueManager {
  private maxRetries = 3;

  /**
   * Add an operation to the sync queue
   */
  async addToQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    try {
      const newOperation: SyncOperation = {
        ...operation,
        id: `${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        retries: 0,
      };
      await addSyncOperation(newOperation);
      console.log('[SyncQueue] Operation added to queue:', newOperation.type);
    } catch (error) {
      console.error('[SyncQueue] Failed to add operation to queue:', error);
    }
  }

  /**
   * Get all pending operations from the queue
   */
  async getQueue(): Promise<SyncOperation[]> {
    try {
      const queue = await getSyncQueue();
      return queue;
    } catch (error) {
      console.error('[SyncQueue] Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Remove an operation from the queue
   */
  async removeFromQueue(operationId: string): Promise<void> {
    try {
      await removeSyncOperationDb(operationId);
      console.log('[SyncQueue] Operation removed from queue');
    } catch (error) {
      console.error('[SyncQueue] Failed to remove operation from queue:', error);
    }
  }

  /**
   * Increment retry count for an operation
   */
  async incrementRetry(operationId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const op = queue.find(item => item.id === operationId);
      const newRetries = (op?.retries ?? 0) + 1;
      await updateSyncOperationRetries(operationId, newRetries);
    } catch (error) {
      console.error('[SyncQueue] Failed to increment retry:', error);
    }
  }

  /**
   * Clear all operations from the queue
   */
  async clearQueue(): Promise<void> {
    try {
      await clearSyncQueue();
      console.log('[SyncQueue] Queue cleared');
    } catch (error) {
      console.error('[SyncQueue] Failed to clear queue:', error);
    }
  }

  /**
   * Get the timestamp of the last successful sync
   */
  async getLastSyncTime(): Promise<number | null> {
    try {
      const timestamp = await getLastSyncTimeDb();
      return timestamp;
    } catch (error) {
      console.error('[SyncQueue] Failed to get last sync time:', error);
      return null;
    }
  }

  /**
   * Update the last sync timestamp
   */
  async updateLastSyncTime(): Promise<void> {
    try {
      await updateLastSyncTimeDb();
    } catch (error) {
      console.error('[SyncQueue] Failed to update last sync time:', error);
    }
  }

  /**
   * Check if an operation should be retried
   */
  shouldRetry(operation: SyncOperation): boolean {
    return operation.retries < this.maxRetries;
  }

  /**
   * Get the number of pending operations
   */
  async getPendingCount(): Promise<number> {
    return getPendingSyncCount();
  }
}

// Export singleton instance
export const syncQueueManager = new SyncQueueManager();

/**
 * Sync error types
 */
export class SyncError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export class NetworkError extends SyncError {
  constructor(operation: string, originalError?: any) {
    super('Network connection failed', operation, originalError);
    this.name = 'NetworkError';
  }
}

export class ServerError extends SyncError {
  constructor(operation: string, statusCode: number, originalError?: any) {
    super(`Server error: ${statusCode}`, operation, originalError);
    this.name = 'ServerError';
  }
}

/**
 * Determines if an error is network-related and operation should be queued
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // Axios network errors
  if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
    return true;
  }
  
  // No response from server
  if (error.response === undefined && error.request) {
    return true;
  }
  
  return false;
}

/**
 * Determines if an error is recoverable and should be retried
 */
export function isRecoverableError(error: any): boolean {
  if (isNetworkError(error)) return true;
  
  // Server timeout or temporary errors
  const status = error?.response?.status;
  if (status === 408 || status === 429 || status === 503 || status === 504) {
    return true;
  }
  
  return false;
}
