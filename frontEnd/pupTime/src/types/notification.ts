export type NotificationTypeCode = 'Friend_Request' | 'Friend_Accepted' | 'Invitation' | 'Report' | 'Message' | string;

export type ApiNotification = {
  id: number;
  receiver: number;
  type: NotificationTypeCode;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown>;
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  Friend_Request: 'Friend Request',
  Friend_Accepted: 'Friend Accepted',
  Invitation: 'Invitation',
  Report: 'Report',
  Message: 'Message',
};
