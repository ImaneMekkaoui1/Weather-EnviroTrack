export type NotificationType =
  | 'USER_REGISTRATION'
  | 'ALERT'
  | 'APPROVAL'
  | 'ACCOUNT_VALIDATION'
  | 'ACCOUNT_APPROVED'
  | 'ACCOUNT_REJECTED'
  | 'WEATHER_ALERT'
  | 'AIR_QUALITY_ALERT'
  | 'SYSTEM_ALERT';

export type NotificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'READ' | 'UNREAD';

export interface Notification {
    id: number;
    type: NotificationType;
    message: string;
    status: NotificationStatus;
    createdAt: string;
    userId?: number;
    targetUserId?: number;
    alertId?: number;
    read?: boolean;
    title?: string;
} 