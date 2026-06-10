import api from './api';
import type { ApiNotification } from '../types/notification';

const isNotFoundResponse = (error: any): boolean => error?.response?.status === 404;

export interface PaginatedNotifications {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApiNotification[];
}

export const getNotifications = async (page: number = 1): Promise<PaginatedNotifications> => {
  try {
    const response = await api.get(`/notification/?page=${page}`);
    return response.data as PaginatedNotifications;
  } catch (error) {
    if (isNotFoundResponse(error)) {
      return { count: 0, next: null, previous: null, results: [] };
    }
    throw error;
  }
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await api.get('/notification/count-unread/');
  const unreadCount = Number(response.data?.unread_count);

  return Number.isFinite(unreadCount) && unreadCount >= 0 ? unreadCount : 0;
};

/** Mark a single notification as read. */
export const markNotificationAsRead = async (notificationId: number): Promise<void> => {
  await api.post('/notification/mark-as-read/', { notification_id: notificationId });
};

/** Mark all notifications as read by calling the single mark API for each. */
export const markAllNotificationsAsRead = async (unreadIds: number[]): Promise<void> => {
  await Promise.all(unreadIds.map(id => markNotificationAsRead(id)));
};
