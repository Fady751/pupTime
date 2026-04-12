import {
    createSlice,
    createAsyncThunk,
    type PayloadAction,
} from '@reduxjs/toolkit';
import BackgroundService from 'react-native-background-actions';

import type { TaskTemplate, TaskOverride } from '../../types/task';
import type { GetOverridesParams } from '../../DB';
import type { RootState, AppDispatch } from '../store';
import {
    getTemplatesWithOverrides,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    updateOverrideStatus,
    fullSync,
    type patchTaskOverrideResponse,
} from '../../services/TaskService/syncService';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

export type TaskFilter = {
    priority?: string | null;
    category_ids?: number[];
    template_id?: string | null;
    start_date?: string;
    end_date?: string;
    ordering?: GetOverridesParams[ 'ordering' ];
};

type TasksState = {
    items: TaskTemplate[];
    filter: TaskFilter;
    page: number;
    pageSize: number;
    totalPages: number;
    total: number;
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
};

const PAGE_SIZE = 1000;
const SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

/** Build the params object expected by the repository. */
const buildParams = (
    userId: number,
    filter: TaskFilter,
    page: number,
    pageSize: number,
): GetOverridesParams => ({
    user_id: userId,
    page,
    page_size: pageSize,
    priority: filter.priority ?? undefined,
    // Repository currently accepts a single category; pass the first id.
    category: filter.category_ids?.[ 0 ] ?? undefined,
    template_id: filter.template_id ?? undefined,
    start_date: filter.start_date,
    end_date: filter.end_date,
    ordering: filter.ordering ?? 'start_datetime',
});

/* ═══════════════════════════════════════════════════════════
   ASYNC THUNKS
   ═══════════════════════════════════════════════════════════ */

let isFetching = false;
/** Fetch the first page of tasks (resets the list). */
export const fetchTasks = createAsyncThunk<
    { data: TaskTemplate[]; total: number; totalPages: number },
    number, // userId
    { state: RootState }
>('tasks/fetchTasks', async (userId, { getState }) => {
    const { filter } = getState().tasks;
    const params = buildParams(userId, filter, 1, PAGE_SIZE);
    if (isFetching) {
        return {
            data: getState().tasks.items,
            total: getState().tasks.total,
            totalPages: getState().tasks.totalPages,
        };
    }
    isFetching = true;
    const result = await getTemplatesWithOverrides(params);
    isFetching = false;
    return {
        data: result.data as TaskTemplate[],
        total: result.total,
        totalPages: result.total_pages,
    };
});

/** Load the next page and append to the existing list. */
export const loadMoreTasks = createAsyncThunk<
    { data: TaskTemplate[]; total: number; totalPages: number; page: number },
    number, // userId
    { state: RootState }
>('tasks/loadMoreTasks', async (userId, { getState }) => {
    const { filter, page, totalPages } = getState().tasks;
    const nextPage = page + 1;
    if (nextPage > totalPages) {
        return { data: [], total: 0, totalPages, page };
    }
    const params = buildParams(userId, filter, nextPage, PAGE_SIZE);
    const result = await getTemplatesWithOverrides(params);
    return {
        data: result.data as TaskTemplate[],
        total: result.total,
        totalPages: result.total_pages,
        page: nextPage,
    };
});

/** Create a new task template via syncService. */
export const createTask = createAsyncThunk<TaskTemplate, TaskTemplate>(
    'tasks/createTask',
    async (task) => {
        return await createTemplate(task);
    },
);

/** Partially update a task template via syncService. */
export const updateTask = createAsyncThunk<
    TaskTemplate & { deleted?: string[] } | undefined,
    { id: string; patch: Partial<TaskTemplate> }
>('tasks/updateTask', async ({ id, patch }) => {
    return await updateTemplate(id, patch);
});

/** Soft-delete a task template via syncService. */
export const deleteTask = createAsyncThunk<string, string>(
    'tasks/deleteTask',
    async (id) => {
        await deleteTemplate(id);
        return id;
    },
);

/** Update an override's status (complete / skip / reschedule). */
export const updateOverride = createAsyncThunk<
    { template_id: string; response: patchTaskOverrideResponse | undefined },
    { templateId: string; overrideId: string; data: { status: string; new_datetime?: string } }
>('tasks/updateOverride', async ({ templateId, overrideId, data }) => {
    const response = await updateOverrideStatus(templateId, overrideId, data);
    return { template_id: templateId, response };
});

/**
 * Background sync — calls fullSync() and re-fetches data if changes occurred.
 * Designed to be dispatched on an interval.
 */
export const backgroundSync = createAsyncThunk<
    { data: TaskTemplate[]; total: number; totalPages: number } | null,
    number, // userId
    { state: RootState }
>('tasks/backgroundSync', async (userId, { getState }) => {
    const hasChanges = await fullSync();
    if (!hasChanges) return null;

    // Re-fetch all pages up to the current page so the list stays consistent.
    const { filter, page } = getState().tasks;
    const pagesToFetch = Math.max(page, 1);
    const params = buildParams(userId, filter, 1, PAGE_SIZE * pagesToFetch);
    const result = await getTemplatesWithOverrides(params);
    return {
        data: result.data as TaskTemplate[],
        total: result.total,
        totalPages: result.total_pages,
    };
});

/* ═══════════════════════════════════════════════════════════
   SLICE
   ═══════════════════════════════════════════════════════════ */

const initialState: TasksState = {
    items: [],
    filter: {},
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 0,
    total: 0,
    loading: false,
    loadingMore: false,
    error: null,
};

const tasksSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        /** Update the active filter and reset loaded data. */
        setFilter(state, action: PayloadAction<TaskFilter>) {
            state.filter = action.payload;
            state.items = [];
            state.page = 1;
            state.totalPages = 0;
            state.total = 0;
            state.error = null;
        },

        /** Clear everything (e.g. on logout). */
        resetTasks() {
            return { ...initialState };
        },

        /** Convenience: clear error. */
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        /* ── fetchTasks ──────────────────────── */
        builder
            .addCase(fetchTasks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTasks.fulfilled, (state, { payload }) => {
                state.items = payload.data;
                state.total = payload.total;
                state.totalPages = payload.totalPages;
                state.page = 1;
                state.loading = false;
            })
            .addCase(fetchTasks.rejected, (state, { error }) => {
                state.loading = false;
                state.error = error.message ?? 'Failed to fetch tasks';
            });

        /* ── loadMoreTasks ──────────────────── */
        builder
            .addCase(loadMoreTasks.pending, (state) => {
                state.loadingMore = true;
                state.error = null;
            })
            .addCase(loadMoreTasks.fulfilled, (state, { payload }) => {
                // Deduplicate by id before appending
                const existingIds = new Set(state.items.map((t) => t.id));
                const newItems = payload.data.filter((t) => !existingIds.has(t.id));
                state.items = [ ...state.items, ...newItems ];
                state.total = payload.total;
                state.totalPages = payload.totalPages;
                state.page = payload.page;
                state.loadingMore = false;
            })
            .addCase(loadMoreTasks.rejected, (state, { error }) => {
                state.loadingMore = false;
                state.error = error.message ?? 'Failed to load more tasks';
            });

        /* ── createTask ─────────────────────── */
        builder
            .addCase(createTask.fulfilled, (state, { payload }) => {
                state.items = [ payload, ...state.items ];
                state.total += payload.overrides.length;
            })
            .addCase(createTask.rejected, (state, { error }) => {
                state.error = error.message ?? 'Failed to create task';
            });

        /* ── updateTask ─────────────────────── */
        builder
            .addCase(updateTask.fulfilled, (state, { payload }) => {
                if (!payload) return;
                const idx = state.items.findIndex((t) => t.id === payload.id);
                if (idx !== -1) {
                    const existingOverrides = Array.isArray(state.items[ idx ].overrides)
                        ? state.items[ idx ].overrides
                        : [];
                    const newOverrides = Array.isArray(payload.overrides)
                        ? payload.overrides
                        : [];

                    // Merge: keep existing, add/overwrite from payload by id
                    const overrideMap = new Map(
                        existingOverrides.map((o) => [ o.id, o ]),
                    );
                    for (const o of newOverrides) {
                        overrideMap.set(o.id, o);
                    }

                    // Remove deleted overrides
                    if (payload.deleted) {
                        for (const id of payload.deleted) {
                            overrideMap.delete(id);
                        }
                    }

                    state.items[ idx ] = { ...state.items[ idx ], ...payload };
                    state.items[ idx ].overrides = Array.from(overrideMap.values());
                    state.total = state.items.reduce(
                        (sum, t) => sum + (t.overrides?.length ?? 0), 0,
                    );
                }
            })
            .addCase(updateTask.rejected, (state, { error }) => {
                state.error = error.message ?? 'Failed to update task';
            });

        /* ── deleteTask ─────────────────────── */
        builder
            .addCase(deleteTask.fulfilled, (state, { payload: id }) => {
                state.items = state.items.filter((t) => t.id !== id);
                state.total = Math.max(0, state.total - 1);
            })
            .addCase(deleteTask.rejected, (state, { error }) => {
                state.error = error.message ?? 'Failed to delete task';
            });

        /* ── updateOverride ─────────────────── */
        builder
            .addCase(updateOverride.fulfilled, (state, { payload }) => {
                if (!payload) return;
                const { template_id, response } = payload;
                const tpl = state.items.find((t) => t.id === template_id);
                if (!tpl) return;

                if (response?.type === 'RESCHEDULED') {
                    // Update the rescheduled override in place
                    const ovIdx = tpl.overrides.findIndex(
                        (o) => o.id === response?.rescheduled?.id,
                    );
                    if (ovIdx !== -1) {
                        tpl.overrides[ ovIdx ] = { ...tpl.overrides[ ovIdx ], ...response?.rescheduled };
                    }
                    // Add the new instance
                    tpl.overrides.push({ ...response?.new_instance, status: 'pending' });
                } else {
                    const ovIdx = tpl.overrides.findIndex(
                        (o) => o.id === response?.override?.id,
                    );
                    if (ovIdx !== -1) {
                        tpl.overrides[ ovIdx ] = { ...tpl.overrides[ ovIdx ], ...response?.override };
                    }
                }
            })
            .addCase(updateOverride.rejected, (state, { error }) => {
                state.error = error.message ?? 'Failed to update override';
            });

        /* ── backgroundSync ─────────────────── */
        builder.addCase(backgroundSync.fulfilled, (state, { payload }) => {
            if (!payload) return; // no changes
            state.items = payload.data;
            state.total = payload.total;
            state.totalPages = payload.totalPages;
        });
    },
});

/* ═══════════════════════════════════════════════════════════
   THUNKS — BACKGROUND SYNC LIFECYCLE
   ═══════════════════════════════════════════════════════════ */

/** Background task executed by react-native-background-actions. */
// const bgSyncTask = async (taskData?: { userId: number; dispatch: AppDispatch }) => {
//     if (!taskData) return;
//     const { userId, dispatch } = taskData;

//     // Run once immediately
//     await dispatch(backgroundSync(userId));

//     // Then loop every SYNC_INTERVAL_MS while the service is running
//     // while (BackgroundService.isRunning()) {
//     //     await sleep(SYNC_INTERVAL_MS);
//     //     await dispatch(backgroundSync(userId));
//     // }
// };

// const bgSyncOptions = {
//     taskName: 'BackgroundSync',
//     taskTitle: 'PupTime Sync',
//     taskDesc: 'Syncing your tasks in the background',
//     taskIcon: { name: 'ic_stat_sync', type: 'drawable' },
//     color: '#0048ff',
//     linkingURI: undefined,
// };

/**
 * Start a background sync loop that runs fullSync every 5 minutes.
 * Uses react-native-background-actions so sync continues when the app
 * is backgrounded (persistent foreground-service notification on Android).
 */
export const startBackgroundSync =
    (userId: number) => async (dispatch: AppDispatch) => {
    //     if (BackgroundService.isRunning()) return;

    //     await BackgroundService.start(bgSyncTask, {
    //         ...bgSyncOptions,
    //         parameters: { userId, dispatch },
    //     });
        await dispatch(backgroundSync(userId));
    };

/** Stop the background sync loop. */
// export const stopBackgroundSync = () => async () => {
//     if (BackgroundService.isRunning()) {
//         await BackgroundService.stop();
//     }
// };

/* ═══════════════════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════════════════ */

export const { setFilter, resetTasks, clearError } = tasksSlice.actions;

// Selectors
export const selectTasks = (state: RootState) => state.tasks.items;
export const selectTasksLoading = (state: RootState) => state.tasks.loading;
export const selectTasksLoadingMore = (state: RootState) => state.tasks.loadingMore;
export const selectTasksError = (state: RootState) => state.tasks.error;
export const selectTasksFilter = (state: RootState) => state.tasks.filter;
export const selectTasksPage = (state: RootState) => state.tasks.page;
export const selectTasksTotalPages = (state: RootState) => state.tasks.totalPages;
export const selectTasksTotal = (state: RootState) => state.tasks.total;
export const selectHasMore = (state: RootState) =>
    state.tasks.page < state.tasks.totalPages;

export default tasksSlice.reducer;
