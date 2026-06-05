jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date' },
}));

import * as Notifications from 'expo-notifications';

import {
  cancelNotification,
  requestPermissions,
  scheduleNotification,
} from '@/notifications/notifications.service';

const scheduleNotificationAsync = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelScheduledNotificationAsync =
  Notifications.cancelScheduledNotificationAsync as jest.Mock;
const getPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissionsAsync = Notifications.requestPermissionsAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  scheduleNotificationAsync.mockResolvedValue('notif-id-1');
  cancelScheduledNotificationAsync.mockResolvedValue(undefined);
});

describe('scheduleNotification', () => {
  it('schedules a repeating daily trigger for a payload with a schedule', async () => {
    const id = await scheduleNotification({
      type: 'dailyReminder',
      title: 'Log spending',
      body: 'do it',
      schedule: { hour: 21, minute: 0, repeats: true },
    });

    expect(id).toBe('notif-id-1');
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const arg = scheduleNotificationAsync.mock.calls[0][0];
    expect(arg.content).toMatchObject({ title: 'Log spending', body: 'do it' });
    expect(arg.trigger).toMatchObject({ type: 'daily', hour: 21, minute: 0 });
  });

  it('schedules an immediate notification when there is no schedule or date', async () => {
    await scheduleNotification({ type: 'zeroDayCheck', title: 't', body: 'b' });
    expect(scheduleNotificationAsync.mock.calls[0][0].trigger).toBeNull();
  });
});

describe('cancelNotification', () => {
  it('cancels by identifier', async () => {
    await cancelNotification('abc');
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('abc');
  });
});

describe('requestPermissions', () => {
  it('returns true without prompting when already granted', async () => {
    getPermissionsAsync.mockResolvedValue({ granted: true });
    expect(await requestPermissions()).toBe(true);
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('prompts when not granted and maps the result', async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false });
    requestPermissionsAsync.mockResolvedValue({ granted: true });
    expect(await requestPermissions()).toBe(true);
    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});
