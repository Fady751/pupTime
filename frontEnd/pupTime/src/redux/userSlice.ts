import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getData } from '../utils/authStorage';
import { User } from '../types/user';
import { getUser, GetUserResponse } from '../services/userServices/getuser';

type UserState = {
  data: User | null;
  loading: boolean;
  error: string | null;
};

const initialState: UserState = {
  data: null,
  loading: false,
  error: null,
};

export const fetchUser = createAsyncThunk<User | null>(
  'user/fetchUser',
  async (_, { rejectWithValue }) => {
    const authData = await getData();
    if (!authData?.id) return null;

    const response: GetUserResponse = await getUser({ id: authData.id });

    if (!response.success || !response.user) {
      return rejectWithValue('Failed to fetch user');
    }

    return response.user;
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // 1: set user (take user and set it)
    setUser(state, action: PayloadAction<User>) {
      state.data = action.payload;
      state.error = null;
    },
    // 2: clear user (just delete user data from the store)
    clearUser(state) {
      state.data = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.data = null;
        state.error = (action.payload as string) || 'Failed to fetch user';
      });
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
export const selectUser = (state: { user: UserState }) => state.user.data;
