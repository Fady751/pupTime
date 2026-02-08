import api from '../api';

export type SignUpPayload = {
  username: string;
  email: string;
  password: string;
  gender: string;
  birth_day: string;
};

export type SignUpResponse = {
  success: boolean;
  message: string;
  error: {username?: [string], email?: [string], password?: [string], gender?: [string], birth_day?: [string]} | null;
};

export const signUp = async (
  payload: SignUpPayload,
): Promise<SignUpResponse> => {
  console.log('SignUp payload:', payload);

  try {
    const response = await api.post(`/user/register/`, payload);
    console.log('Raw API response:', response);

    return {
      success: response.data?.success ?? true,
      message: response.data?.message || 'Sign up completed',
      error: response.data?.error || null,
    };
  } catch (error: any) {
    console.log('API error response:', error.response.data);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Sign up failed',
      error: error.response?.data || null,
    };
  }
};
