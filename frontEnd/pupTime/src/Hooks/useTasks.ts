import { useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { TaskTemplate } from '../types/task';
import type { AppDispatch, RootState } from '../redux/store';
import {
  fetchTasks,
  loadMoreTasks,
  createTask,
  updateTask,
  deleteTask,
  updateOverride,
  startBackgroundSync,
  stopBackgroundSync,
  setFilter,
  resetTasks,
  clearError,
  selectTasks,
  selectTasksLoading,
  selectTasksLoadingMore,
  selectTasksError,
  selectTasksFilter,
  selectHasMore,
  selectTasksTotal,
  type TaskFilter,
} from '../redux/slices/tasksSlice';

/**
 * Central hook for task CRUD, pagination, filtering, and background sync.
 */
export const useTasks = (userId: number) => {
  const dispatch = useDispatch<AppDispatch>();

  /* ── selectors ─────────────────────────────────── */
  const { items: tasks, loading, loadingMore, error, filter, page, totalPages, total } = useSelector((state: RootState) => state.tasks);
  const hasMore = useMemo(() => page < totalPages, [ page, totalPages ]);

  /* ── initial fetch + background sync lifecycle ── */
  useEffect(() => {
    dispatch(fetchTasks(userId));
    dispatch(startBackgroundSync(userId));

    return () => {
      dispatch(stopBackgroundSync());
    };
  }, [ userId, dispatch ]);

  /* ── actions ────────────────────────────────────── */

  /** Reload the first page (e.g. pull-to-refresh). */
  const refresh = useCallback(() => {
    dispatch(fetchTasks(userId));
  }, [ userId, dispatch ]);

  /** Load the next page of tasks. */
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    dispatch(loadMoreTasks(userId));
  }, [ userId, hasMore, loadingMore, dispatch ]);

  /** Create a new task template. */
  const create = useCallback(
    (task: TaskTemplate) => dispatch(createTask(task)).unwrap(),
    [ dispatch ],
  );

  /** Partially update a task template. */
  const update = useCallback(
    (id: string, patch: Partial<TaskTemplate>) =>
      dispatch(updateTask({ id, patch })).unwrap(),
    [ dispatch ],
  );

  /** Soft-delete a task template. */
  const remove = useCallback(
    (id: string) => dispatch(deleteTask(id)).unwrap(),
    [ dispatch ],
  );

  /** Update an override's status (complete / skip / reschedule). */
  const changeOverride = useCallback(
    (
      templateId: string,
      overrideId: string,
      data: { status: string; new_datetime?: string },
    ) => dispatch(updateOverride({ templateId, overrideId, data })).unwrap(),
    [ dispatch ],
  );

  /** Replace the active filter (resets the list). */
  const applyFilter = useCallback(
    async (newFilter: TaskFilter) => {
      dispatch(setFilter(newFilter));
      await dispatch(fetchTasks(userId));
    },
    [ userId, dispatch ],
  );

  /** Clear everything (e.g. on logout). */
  const reset = useCallback(() => {
    dispatch(stopBackgroundSync());
    dispatch(resetTasks());
  }, [ dispatch ]);

  /** Clear error. */
  const dismissError = useCallback(() => dispatch(clearError()), [ dispatch ]);

  return {
    // Data
    tasks,
    total,
    filter,
    hasMore,

    // Status
    loading,
    loadingMore,
    error,

    // Actions
    refresh,
    loadMore,
    create,
    update,
    remove,
    changeOverride,
    applyFilter,
    reset,
    dismissError,
  };
};
