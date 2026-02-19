import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Task, TaskRepetition } from '../types/task';
import * as taskService from '../services/TaskService/syncService';
import type { RootState, AppDispatch } from '../redux/store';
import {
  clearTasks,
  removeTask,
  setError,
  setLoading,
  setTasks,
  upsertTask,
} from '../redux/tasksSlice';
import type { SerializedTask } from '../redux/tasksSlice';

export const useTasks = (userId: number | null) => {
  const dispatch = useDispatch<AppDispatch>();
  const storedTasks = useSelector((state: RootState) => state.tasks.items);
  const loading = useSelector((state: RootState) => state.tasks.loading);
  const error = useSelector((state: RootState) => state.tasks.error);

  const toSerializableTask = (task: Task): SerializedTask => {
    return {
      ...task,
      startTime: task.startTime.toISOString(),
      endTime: task.endTime ? task.endTime.toISOString() : null,
      repetition: (task.repetition || []).map((rep) => ({
        ...rep,
        time: rep.time ? rep.time.toISOString() : null,
      })),
    };
  };

  const fromSerializableTask = (task: SerializedTask): Task => {
    return {
      ...task,
      startTime: new Date(task.startTime),
      endTime: task.endTime ? new Date(task.endTime) : null,
      repetition: (task.repetition || []).map((rep) => ({
        ...rep,
        time: rep.time ? new Date(rep.time) : null,
      })) as TaskRepetition[],
    };
  };

  const tasks = storedTasks.map(fromSerializableTask);

  const loadTasks = async () => {
    if (!userId) {
      dispatch(clearTasks());
      return;
    }

    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const userTasks = await taskService.getTasks(userId);
      dispatch(setTasks(userTasks.map(toSerializableTask)));
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to load tasks'));
      console.error('[useTasks] Error loading tasks:', err);
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const createTask = async (task: Omit<Task, 'id'>) => {
    try {
      const createdTask = await taskService.addTask(task);
      if (createdTask) {
        dispatch(upsertTask(toSerializableTask(createdTask)));
      }
      await loadTasks();
      return createdTask;
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to create task'));
      throw err;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await taskService.updateTask(taskId, updates);
      await loadTasks();
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
      await loadTasks();
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to delete task'));
      throw err;
    }
  };

  // const completeTask = async (taskId: number) => {
  //   try {
  //     await taskService.completeTask(taskId);
  //     await loadTasks();
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'Failed to complete task');
  //     throw err;
  //   }
  // };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    // completeTask,
    refresh: loadTasks,
  };
};
