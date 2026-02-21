import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Task, isTaskCompletedForDate, toLocalDateString } from '../types/task';
import * as taskService from '../services/TaskService/syncService';
import type { RootState, AppDispatch } from '../redux/store';
import {
  fromSerializableTask,
  removeTask,
  setError,
  toSerializableTask,
  upsertTask,
  fetchTasks,
} from '../redux/tasksSlice';

export const useTasks = (userId: number | null) => {
  const dispatch = useDispatch<AppDispatch>();
  const {items: storedTasks, loading, error} = useSelector((state: RootState) => state.tasks);

  const tasks = useMemo(() => storedTasks.map(fromSerializableTask), [storedTasks]);

  const loadTasks = () => {
    if(!userId) return;
    dispatch(fetchTasks(userId!));
  };

  const createTask = async (task: Omit<Task, 'id'>) => {
    try {
      const createdTask = await taskService.addTask(task);
      if (createdTask) {
        dispatch(upsertTask(toSerializableTask(createdTask)));
      }
      return createdTask;
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to create task'));
      throw err;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await taskService.updateTask(taskId, updates);
      dispatch(upsertTask(toSerializableTask({...updates, id: taskId} as Task)));
      return;
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to update task'));
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      dispatch(removeTask(taskId));
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to delete task'));
      throw err;
    }
  };

  const completeTask = async (taskId: string, date: Date) => {
    try {
      const added = await taskService.completeTask(taskId, date);
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        dispatch(upsertTask(toSerializableTask({...task, completions: [...task.completions, added]})));
      }
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to complete task'));
      throw err;
    }
  };

  const uncompleteTask = async (taskId: string, date: Date) => {
    try {
      await taskService.uncompleteTask(taskId, date);
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const updatedCompletions = task.completions.filter(c => toLocalDateString(c.date) !== toLocalDateString(date));
        dispatch(upsertTask(toSerializableTask({...task, completions: updatedCompletions})));
      }
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to uncomplete task'));
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
    uncompleteTask,
    isTaskCompletedForDate,
    refresh: loadTasks,
  };
};
