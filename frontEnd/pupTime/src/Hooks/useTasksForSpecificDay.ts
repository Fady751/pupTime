import { useMemo } from 'react';
import { isTaskOnDate, isTaskCompletedForDate, toLocalDateString, canCompleteForDate } from '../types/task';
import { useTasks } from './useTasks';

/**
 * Hook that filters all user tasks down to those that fall on a specific date,
 * and splits them into pending / completed buckets.
 *
 * Internally wraps `useTasks` so it shares the same Redux store data.
 */
export const useTasksForSpecificDay = (userId: number | null, date: Date) => {
  const {
    tasks: allTasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    refresh,
  } = useTasks(userId);

  // Stabilise date comparison by normalising to YYYY-MM-DD string (local time)
  const dateKey = toLocalDateString(date);

  const dayTasks = useMemo(
    () => allTasks.filter(t => isTaskOnDate(t, date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTasks, dateKey],
  );

  const pendingTasks = useMemo(
    () => dayTasks.filter(t => !isTaskCompletedForDate(t, date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayTasks, dateKey],
  );

  const completedTasks = useMemo(
    () => dayTasks.filter(t => isTaskCompletedForDate(t, date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayTasks, dateKey],
  );

  /** Whether the user can mark tasks complete for this date (not in the future). */
  const canComplete = canCompleteForDate(date);

  /** Toggle completion for a task on the hook's date. */
  const toggleComplete = async (taskId: string) => {
    const task = dayTasks.find(t => t.id === taskId);
    if (!task) return;
    if (isTaskCompletedForDate(task, date)) {
      await uncompleteTask(taskId, date);
    } else {
      if (!canComplete) return;  // guard: cannot complete future dates
      await completeTask(taskId, date);
    }
  };

  return {
    /** All tasks that fall on this date */
    tasks: dayTasks,
    /** All user tasks (unfiltered) */
    allTasks,
    pendingTasks,
    completedTasks,
    loading,
    error,
    /** Whether tasks can be completed for this date */
    canComplete,
    /** Toggle a specific task's completion for this date */
    toggleComplete,
    completeTask,
    uncompleteTask,
    createTask,
    updateTask,
    deleteTask,
    refresh,
  };
};
