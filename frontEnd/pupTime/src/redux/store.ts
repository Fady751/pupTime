import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import networkReducer from './networkSlice';
import tasksReducer from './tasksSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    network: networkReducer,
    tasks: tasksReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
