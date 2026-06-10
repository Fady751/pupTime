import api from '../api';

export type GooglePayload = {
    id_token: string;
};

export type GoogleLoginResponse = {
  success: boolean;
  message: string;
  id?: number;
  token?: string;
  error: string | null;
  is_new_user?: boolean;
};

export const loginWithGoogle = async (
  payload: GooglePayload,
): Promise<GoogleLoginResponse> => {

  try {
    const response = await api.post(`/user/auth/google`, payload);

    return {
      success: response.data?.success ?? true,
      message: response.data?.message || 'Login completed',
      id: response.data?.user_id,
      token: response.data?.token,
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
