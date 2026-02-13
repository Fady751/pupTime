import api from '../api';
import { Category } from '../../types/category';

export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await api.get(`/user/interest-categories`);
    
    return response.data;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};
