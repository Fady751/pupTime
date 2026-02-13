import api from '../api';
import { User } from '../../types/user';

export type EditUserPayload = {
  id: number;
  username?: string;
  email?: string;
  password?: string;
  google_auth_id?: string | null;
  gender?: string;
  birth_day?: string;
};

export type EditUserResponse = {
  success: boolean;
  message: string;
  user: User | null;
  error?: {username?: [string], email?: [string], password?: [string], gender?: [string], birth_day?: [string]} | null;
};

export const editUser = async (
  payload: EditUserPayload,
): Promise<EditUserResponse> => {
  try {
    const response = await api.put(`/user/${payload.id}`, payload);

    return {
      success: true,
      message: response.data?.message || 'Profile updated successfully',
      user: response.data || null,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to update profile',
      user: null,
      error: error.response?.data || null,
    };
  }
};
