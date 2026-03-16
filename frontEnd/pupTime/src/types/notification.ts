export type NotificationTypeCode = 'FR' | 'FA' | 'IN' | 'RP' | 'MS' | string;

export type ApiNotification = {
  id: number;
  receiver: number;
  type: NotificationTypeCode;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown>;
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  FR: 'Friend Request',
  FA: 'Friend Accepted',
  IN: 'Invitation',
  RP: 'Report',
  MS: 'Message',
};
