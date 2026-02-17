import { Task } from '../types/task';
import { Category } from '../types/category';
import * as TaskDB from './index';

/**
 * TaskService - High-level service for managing tasks locally
 */
class TaskService {
  private initialized = false;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await TaskDB.getDatabase();
      this.initialized = true;
    } catch (error) {
      console.error('[TaskService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(task: Omit<Task, 'id'>): Promise<number> {
    await this.ensureInitialized();
    return TaskDB.createTask(task);
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: number): Promise<Task | null> {
    await this.ensureInitialized();
    return TaskDB.getTaskById(taskId);
  }

  /**
   * Get all tasks for a user
   */
  async getUserTasks(userId: number): Promise<Task[]> {
    await this.ensureInitialized();
    return TaskDB.getTasksByUserId(userId);
  }

  /**
   * Get pending tasks for a user
   */
  async getPendingTasks(userId: number): Promise<Task[]> {
    await this.ensureInitialized();
    return TaskDB.getTasksByStatus(userId, 'pending');
  }

  /**
   * Get completed tasks for a user
   */
  async getCompletedTasks(userId: number): Promise<Task[]> {
    await this.ensureInitialized();
    return TaskDB.getTasksByStatus(userId, 'completed');
  }

  /**
   * Update a task
   */
  async updateTask(taskId: number, updates: Partial<Task>): Promise<void> {
    await this.ensureInitialized();
    return TaskDB.updateTask(taskId, updates);
  }

  /**
   * Mark a task as completed
   */
  async completeTask(taskId: number): Promise<void> {
    await this.ensureInitialized();
    return TaskDB.updateTask(taskId, { status: 'completed' });
  }

  /**
   * Mark a task as pending
   */
  async uncompleteTask(taskId: number): Promise<void> {
    await this.ensureInitialized();
    return TaskDB.updateTask(taskId, { status: 'pending' });
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: number): Promise<void> {
    await this.ensureInitialized();
    return TaskDB.deleteTask(taskId);
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    await this.ensureInitialized();
    return TaskDB.getAllCategories();
  }

  /**
   * Search tasks by title
   */
  async searchTasks(userId: number, query: string): Promise<Task[]> {
    await this.ensureInitialized();
    return TaskDB.searchTasksByTitle(userId, query);
  }

  /**
   * Get tasks within a date range
   */
  async getTasksByDateRange(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Task[]> {
    await this.ensureInitialized();
    return TaskDB.getTasksByDateRange(userId, startDate, endDate);
  }

  /**
   * Get tasks for today
   */
  async getTodayTasks(userId: number): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getTasksByDateRange(userId, today, tomorrow);
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ tasksCount: number; categoriesCount: number }> {
    await this.ensureInitialized();
    return TaskDB.getDatabaseStats();
  }

  /**
   * Clear all data (for testing/development)
   */
  async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    return TaskDB.dropAllTables();
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.initialized) {
      await TaskDB.closeDatabase();
      this.initialized = false;
    }
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();
