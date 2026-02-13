import api from '../../api';
import { Interests } from '../../../types/interests';

export type ChangeUserInterestPayload = {
    user_id: number;
    selected: number[];
};

export type ChangeUserInterestResponse = {
    success: boolean;
    message: string;
    data: Interests;
};

export const changeUserInterest = async (payload: ChangeUserInterestPayload): Promise<ChangeUserInterestResponse> => {
  try {
    // console.log(`Making PUT request to /user/${payload.user_id}/interests with selected interests:`, payload.selected);
    const response = await api.put(`/user/${payload.user_id}/interests`, {
      interest_ids: payload.selected,
    });
    
    return {
        success: true,
        message: response.data?.message || 'User interests updated successfully',
        data: response?.data,
    };
  } catch (error) {
    console.error('Failed to change user interests:', error);
    throw error;
  }
};
