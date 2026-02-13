import api from '../../api';
import { Interests } from '../../../types/interests';

export type GetUserInterestPayload = {
    user_id: number;
};

export const getUserInterest = async (payload: GetUserInterestPayload): Promise<Interests[]> => {
  try {
    const response = await api.get(`/user/${payload.user_id}/interests`);
    
    return response?.data;
  } catch (error) {
    console.error('Failed to get user interests:', error);
    throw error;
  }
};
