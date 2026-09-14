import {
  apiRequest,
} from '../api/client';

export type NotificationType =
  | 'student.boarded'
  | 'student.dropped_off';

export interface ParentNotification {
  id: string;

  schoolId:
    string;

  guardianId:
    string;

  studentId:
    string;

  tripId:
    string;

  tripRiderEventId:
    string;

  notificationType:
    NotificationType;

  title:
    string;

  body:
    string;

  payload:
    Record<
      string,
      unknown
    >;

  readAt:
    | string
    | null;

  createdAt:
    string;
}

export interface PaginatedNotifications {
  items:
    ParentNotification[];

  nextCursor:
    | string
    | null;
}

export interface NotificationPreferences {
  notifyBoarded:
    boolean;

  notifyDroppedOff:
    boolean;

  notifyTripUpdates:
    boolean;
}

export interface UpdateNotificationPreferencesInput {
  notifyBoarded?:
    boolean;

  notifyDroppedOff?:
    boolean;

  notifyTripUpdates?:
    boolean;
}

export interface ListNotificationsQuery {
  limit?:
    number;

  cursor?:
    string;
}

function buildQuery(
  query:
    ListNotificationsQuery,
): string {
  const params =
    new URLSearchParams();

  if (query.limit) {
    params.set(
      'limit',
      String(
        query.limit,
      ),
    );
  }

  if (query.cursor) {
    params.set(
      'cursor',
      query.cursor,
    );
  }

  const value =
    params.toString();

  return value
    ? `?${value}`
    : '';
}

export function listMyNotifications(
  tenantId: string,
  query:
    ListNotificationsQuery = {},
): Promise<PaginatedNotifications> {
  return apiRequest<PaginatedNotifications>(
    `/me/notifications${buildQuery(
      query,
    )}`,
    {
      tenantId,
    },
  );
}

export function markNotificationRead(
  tenantId: string,
  notificationId: string,
): Promise<ParentNotification> {
  return apiRequest<ParentNotification>(
    `/me/notifications/${notificationId}/read`,
    {
      method:
        'PATCH',

      tenantId,
    },
  );
}

export function getMyNotificationPreferences(
  tenantId: string,
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>(
    '/me/notification-preferences',
    {
      tenantId,
    },
  );
}

export function updateMyNotificationPreferences(
  tenantId: string,
  input:
    UpdateNotificationPreferencesInput,
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>(
    '/me/notification-preferences',
    {
      method:
        'PATCH',

      tenantId,

      body:
        JSON.stringify(
          input,
        ),
    },
  );
}
