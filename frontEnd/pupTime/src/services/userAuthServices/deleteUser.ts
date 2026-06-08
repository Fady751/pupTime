import api from '../api';

export type DeleteUserPayload = {
  id: number;
};

export type DeleteUserResponse = {
  success: boolean;
  message: string;
};

export const deleteUser = async (
  payload: DeleteUserPayload,
): Promise<DeleteUserResponse> => {
  try {
    const response = await api.delete(`/user/${payload.id}`);

    return {
      success: true,
      message: response.data?.message || 'User deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Delete user failed',
    };
  }
};
