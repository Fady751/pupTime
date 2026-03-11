import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import networkReducer from './slices/networkSlice';
import tasksReducer from './slices/tasksSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    network: networkReducer,
    tasks: tasksReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
