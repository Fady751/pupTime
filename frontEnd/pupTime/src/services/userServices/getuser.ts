import api from '../api';
import { User } from '../../types/user';

export type GetUserPayload = {
  id: number;
};

export type GetUserResponse = {
  success: boolean;
  message: string;
  user: User | null;
};

export const getUser = async (
  payload: GetUserPayload,
): Promise<GetUserResponse> => {
  console.log('getUser payload:', payload);

  try {
    const response = await api.get(`/user/${payload.id}`); // add correct endpoint

    console.log('getUser response:', response.data);

    return {
      success: true,
      message: response.data?.message || 'Get user completed',
      user: response.data?.user || null,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Get user failed',
      user: null,
    };
  }
};
