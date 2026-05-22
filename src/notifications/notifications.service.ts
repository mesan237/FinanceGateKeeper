import type { NotificationPayload } from '@/notifications/notifications.types';

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(`${method} is not implemented yet (delivered in VS-08).`);
    this.name = 'NotImplementedError';
  }
}

/**
 * Schedules a local notification. Stub — implemented in VS-08.
 */
export async function scheduleNotification(_payload: NotificationPayload): Promise<string> {
  throw new NotImplementedError('scheduleNotification');
}

/**
 * Cancels a previously scheduled local notification. Stub — implemented in VS-08.
 */
export async function cancelNotification(_id: string): Promise<void> {
  throw new NotImplementedError('cancelNotification');
}
