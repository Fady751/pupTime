import api from '../api';
import { getFCMToken } from './login';

export type GooglePayload = {
    id_token: string;
};

export type GoogleLoginResponse = {
  success: boolean;
  message: string;
  id?: number;
  token?: string;
  fcm_token?: string;
  error: string | null;
  is_new_user?: boolean;
};

export const loginWithGoogle = async (
  payload: GooglePayload,
): Promise<GoogleLoginResponse> => {

  try {
    const fcmToken = await getFCMToken();

    const requestBody: GooglePayload & { fcm_token?: string } = { ...payload };
    if (fcmToken) {
      requestBody.fcm_token = fcmToken;
    }

    const response = await api.post(`/user/auth/google`, requestBody);

    return {
      success: response.data?.success ?? true,
      message: response.data?.message || 'Login completed',
      id: response.data?.user_id,
      token: response.data?.token,
      fcm_token: response.data?.fcm_token ?? fcmToken ?? undefined,
      is_new_user: response.data?.is_new_user,
      error: null,
    };
  } catch (error: any) {
    console.error('Login error:', error.response?.data?.error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Login failed',
      error: error.response?.data?.error || (error instanceof Error ? error.message : 'Login failed'),
    };
  }
};
