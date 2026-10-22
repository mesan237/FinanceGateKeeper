jest.mock('@/notifications/notifications.service', () => ({
  getScheduledNotifications: jest.fn(),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  requestPermissions: jest.fn(),
  scheduleNotification: jest.fn().mockResolvedValue('id-1'),
}));
jest.mock('@/services/transactions', () => ({
  getLoggedDays: jest.fn(),
}));

import { applyReminderSchedule } from '@/features/finance/auth/reminder';
import {
  cancelNotification,
  getScheduledNotifications,
  requestPermissions,
  scheduleNotification,
} from '@/notifications/notifications.service';
import { REMINDER_DAYS_AHEAD } from '@/notifications/triggers/dailyReminder';
import { getLoggedDays } from '@/services/transactions';
import { toISODate } from '@/utils/formatDate';

const mockedGetScheduled = getScheduledNotifications as jest.MockedFunction<
  typeof getScheduledNotifications
>;
const mockedCancel = cancelNotification as jest.MockedFunction<typeof cancelNotification>;
const mockedRequest = requestPermissions as jest.MockedFunction<typeof requestPermissions>;
const mockedSchedule = scheduleNotification as jest.MockedFunction<typeof scheduleNotification>;
const mockedLoggedDays = getLoggedDays as jest.MockedFunction<typeof getLoggedDays>;

/** 09:00 local on 15 Aug 2026. */
const NOW = new Date(2026, 7, 15, 9, 0);

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetScheduled.mockResolvedValue([]);
  mockedRequest.mockResolvedValue(true);
  mockedLoggedDays.mockResolvedValue(new Set());
});

describe('applyReminderSchedule (VS-57)', () => {
  it('cancels existing daily reminders, then plans one a day ahead', async () => {
    mockedGetScheduled.mockResolvedValue([
      { identifier: 'old-1', content: { data: { type: 'dailyReminder' } } },
      { identifier: 'old-2', content: { data: { type: 'dailyReminder' } } },
      { identifier: 'other', content: { data: { type: 'debtDueDate' } } },
    ] as never);

    await applyReminderSchedule({ reminderTime: '21:00', notificationsEnabled: true }, NOW);

    expect(mockedCancel.mock.calls.map(([id]) => id)).toEqual(['old-1', 'old-2']);
    expect(mockedSchedule).toHaveBeenCalledTimes(REMINDER_DAYS_AHEAD);
    expect(mockedSchedule.mock.calls[0][0].scheduledAt).toEqual(new Date(2026, 7, 15, 21, 0));
  });

  it('does not remind today once something is logged today', async () => {
    mockedLoggedDays.mockResolvedValue(new Set([toISODate(new Date(2026, 7, 15, 21, 0))]));

    await applyReminderSchedule({ reminderTime: '21:00', notificationsEnabled: true }, NOW);

    expect(mockedSchedule).toHaveBeenCalledTimes(REMINDER_DAYS_AHEAD - 1);
    expect(mockedSchedule.mock.calls[0][0].scheduledAt).toEqual(new Date(2026, 7, 16, 21, 0));
  });

  it('reads the logged days over the window it plans', async () => {
    await applyReminderSchedule({ reminderTime: '21:00', notificationsEnabled: true }, NOW);

    expect(mockedLoggedDays).toHaveBeenCalledWith(
      toISODate(NOW),
      toISODate(new Date(2026, 7, 15 + REMINDER_DAYS_AHEAD, 23, 59)),
    );
  });

  it('schedules nothing when notifications are disabled', async () => {
    await applyReminderSchedule({ reminderTime: '21:00', notificationsEnabled: false }, NOW);
    expect(mockedSchedule).not.toHaveBeenCalled();
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it('schedules nothing when permission is denied', async () => {
    mockedRequest.mockResolvedValue(false);
    await applyReminderSchedule({ reminderTime: '21:00', notificationsEnabled: true }, NOW);
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(mockedSchedule).not.toHaveBeenCalled();
  });
});
