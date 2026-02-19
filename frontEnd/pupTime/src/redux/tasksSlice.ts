import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Task, TaskRepetition } from '../types/task';

export type SerializedTask = Omit<Task, 'startTime' | 'endTime' | 'repetition'> & {
  startTime: string;
  endTime: string | null;
  repetition: Array<Omit<TaskRepetition, 'time'> & { time: string | null }>;
};

export type TasksState = {
  items: SerializedTask[];
  loading: boolean;
  error: string | null;
};

const initialState: TasksState = {
  items: [],
  loading: false,
  error: null,
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks(state, action: PayloadAction<SerializedTask[]>) {
      state.items = action.payload;
    },
    upsertTask(state, action: PayloadAction<SerializedTask>) {
      const next = action.payload;
      const index = state.items.findIndex((t) => t.id === next.id);
      if (index >= 0) {
        state.items[index] = next;
      } else {
        state.items.unshift(next);
      }
    },
    removeTask(state, action: PayloadAction<string>) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
    clearTasks(state) {
      state.items = [];
      state.loading = false;
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setTasks,
  upsertTask,
  removeTask,
  clearTasks,
  setLoading,
  setError,
} = tasksSlice.actions;

export default tasksSlice.reducer;
