import api from '../api';

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  id?: number;
  token?: string;
  error: string | null;
};

export const loginUser = async (
  payload: LoginPayload,
): Promise<LoginResponse> => {
  console.log('Login payload:', payload);

  try {
    const response = await api.post(`/user/login/`, {
      email: payload.email,
      password: payload.password,
    });

    console.log('Login response:', response.data);

    return {
      success: response.data?.success ?? true,
      message: response.data?.message || 'Login completed',
      id: response.data?.id,
      token: response.data?.token,
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
