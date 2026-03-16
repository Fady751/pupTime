import api from './api';
import type { ApiNotification } from '../types/notification';

const isNotFoundResponse = (error: any): boolean => error?.response?.status === 404;

export const getNotifications = async (): Promise<ApiNotification[]> => {
  try {
    const response = await api.get('/notification/');

    if (!Array.isArray(response.data)) {
      return [];
    }

    return response.data as ApiNotification[];
  } catch (error) {
    if (isNotFoundResponse(error)) {
      return [];
    }
    throw error;
  }
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await api.get('/notification/count/');
  const unreadCount = Number(response.data?.unread_count);

  return Number.isFinite(unreadCount) && unreadCount >= 0 ? unreadCount : 0;
};

export const markNotificationAsRead = async (notificationId: number): Promise<void> => {
  await api.post('/notification/read/', {
    notification_id: notificationId,
  });
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    await api.post('/notification/read-all/', {});
  } catch (error) {
    if (!isNotFoundResponse(error)) {
      throw error;
    }
  }
};
