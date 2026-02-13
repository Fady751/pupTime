import api from '../api';
import { Interests } from '../../types/interests';

export const getInterests = async (): Promise<Interests[]> => {
  try {
    const response = await api.get(`/user/interests`);
    
    return response.data;
  } catch (error) {
    console.error('Failed to fetch interests:', error);
    throw error;
  }
};
