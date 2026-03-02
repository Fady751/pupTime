import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

let listenerInitialized = false;

export const checkInternetConnectivity = createAsyncThunk(
  'network/checkConnectivity',
  async (isNetworkConnected: boolean) => {
    if (!isNetworkConnected) {
      return false;
    }
    if (listenerInitialized) return;
    listenerInitialized = true;
    try {
      await fetch('https://google.com', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
      });
      listenerInitialized = false;
      return true;
    } catch {
      listenerInitialized = false;
      return false;
    }
  }
);

type NetworkState = {
  isConnected: boolean;
  loading: boolean;
  error: string | null;
};

const initialState: NetworkState = {
  isConnected: true,
  loading: true,
  error: null,
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setNetworkStatus(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkInternetConnectivity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkInternetConnectivity.fulfilled, (state, action) => {
        state.isConnected = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(checkInternetConnectivity.rejected, (state, action) => {
        state.isConnected = false;
        state.loading = false;
        state.error = action.error.message || 'Failed to check connectivity';
      });
  },
});

export const { setNetworkStatus } = networkSlice.actions;
export default networkSlice.reducer;
