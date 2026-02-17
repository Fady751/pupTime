import { useEffect, useState } from 'react';
import { Task } from '../types/task';
import { Category } from '../types/category';
import { taskService } from '../DB/taskService';

export const useTasks = (userId: number | null) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const userTasks = await taskService.getUserTasks(userId);
      setTasks(userTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      console.error('[useTasks] Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const createTask = async (task: Omit<Task, 'id'>) => {
    try {
      const taskId = await taskService.createTask(task);
      await loadTasks();
      return taskId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err;
    }
  };

  const updateTask = async (taskId: number, updates: Partial<Task>) => {
    try {
      await taskService.updateTask(taskId, updates);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
      throw err;
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await taskService.deleteTask(taskId);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      throw err;
    }
  };

  const completeTask = async (taskId: number) => {
    try {
      await taskService.completeTask(taskId);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    refresh: loadTasks,
  };
};

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const cats = await taskService.getCategories();
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      console.error('[useCategories] Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refresh: loadCategories,
  };
};

export const useTodayTasks = (userId: number | null) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTodayTasks = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const todayTasks = await taskService.getTodayTasks(userId);
      setTasks(todayTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load today tasks');
      console.error('[useTodayTasks] Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    tasks,
    loading,
    error,
    refresh: loadTodayTasks,
  };
};
