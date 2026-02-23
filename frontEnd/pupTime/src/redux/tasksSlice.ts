import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Task, TaskRepetition, toLocalDateString } from '../types/task';
import { getTasksByUserId } from '../DB';

export type SerializedTaskCompletion = {
  id: string;
  task_id: string;
  completion_time: string;
  date: string;
};

export type SerializedTask = Omit<Task, 'startTime' | 'endTime' | 'repetition' | 'completions'> & {
  startTime: string;
  endTime: string | null;
  repetition: Array<Omit<TaskRepetition, 'time'> & { time: string | null }>;
  completions: SerializedTaskCompletion[];
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

export const toSerializableTask = (t: Task): SerializedTask => {
  return {
      id: t.id,
      user_id: t.user_id,
      emoji: t.emoji,
      priority: t.priority,
      Categorys: t.Categorys,
      reminderTime: t.reminderTime,
      title: t.title,
      startTime: t.startTime.toISOString(),
      endTime: t.endTime ? t.endTime.toISOString() : null,
      repetition: t.repetition.map((r) => ({
        frequency: r.frequency,
        time: r.time ? r.time.toISOString() : null,
      })),
      completions: t.completions.map((c) => ({
        id: c?.id,
        completion_time: c?.completion_time.toISOString(),
        date: toLocalDateString(c.date),
        task_id: c?.task_id,
      }))
  } as SerializedTask;
};

export const fromSerializableTask = (t: SerializedTask): Task => {
  return {
    id: t.id,
    user_id: t.user_id,
    emoji: t.emoji,
    priority: t.priority,
    Categorys: t.Categorys,
    reminderTime: t.reminderTime,
    title: t.title,
    startTime: new Date(t.startTime),
    endTime: t.endTime ? new Date(t.endTime) : null,
    repetition: t.repetition.map((r) => ({
      frequency: r.frequency,
      time: r.time ? new Date(r.time) : null,
    })),
    completions: t.completions.map((c) => ({
      id: c.id,
      completion_time: new Date(c.completion_time),
      date: new Date(c.date),
      task_id: c.task_id,
    }))
  } as Task;
};

export const fetchTasks = createAsyncThunk<
  SerializedTask[],
  number,
  { rejectValue: string }
>(
  'tasks/fetchTasks',
  async (userId, { rejectWithValue }) => {
    try {
      const tasksFromDB = await getTasksByUserId(userId);
      const tasks: SerializedTask[] = tasksFromDB.map((t: Task) => toSerializableTask(t));
      return tasks; 
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch tasks');
    }
  }
);

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

  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'An unknown error occurred';
      });
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
