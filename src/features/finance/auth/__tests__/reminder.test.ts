jest.mock('@/notifications/notifications.service', () => ({
  getScheduledNotifications: jest.fn(),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  requestPermissions: jest.fn(),
  scheduleNotification: jest.fn().mockResolvedValue('id-1'),
}));

import {
  cancelNotification,
  getScheduledNotifications,
  requestPermissions,
  scheduleNotification,
} from '@/notifications/notifications.service';
import { applyReminderSchedule } from '@/features/finance/auth/reminder';

const mockedGetScheduled = getScheduledNotifications as jest.MockedFunction<
  typeof getScheduledNotifications
>;
const mockedCancel = cancelNotification as jest.MockedFunction<typeof cancelNotification>;
const mockedRequest = requestPermissions as jest.MockedFunction<typeof requestPermissions>;
const mockedSchedule = scheduleNotification as jest.MockedFunction<typeof scheduleNotification>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetScheduled.mockResolvedValue([]);
  mockedRequest.mockResolvedValue(true);
});

describe('applyReminderSchedule', () => {
  it('cancels existing daily reminders before scheduling a fresh one', async () => {
    mockedGetScheduled.mockResolvedValue([
      { identifier: 'old-1', content: { data: { type: 'dailyReminder' } } },
      { identifier: 'other', content: { data: { type: 'debtDueDate' } } },
    ] as never);

    await applyReminderSchedule({ reminderTime: '07:30', notificationsEnabled: true });

    expect(mockedCancel).toHaveBeenCalledTimes(1);
    expect(mockedCancel).toHaveBeenCalledWith('old-1');
    expect(mockedSchedule).toHaveBeenCalledTimes(1);
    expect(mockedSchedule.mock.calls[0][0].schedule).toEqual({
      hour: 7,
      minute: 30,
      repeats: true,
    });
  });

  it('schedules nothing when notifications are disabled', async () => {
    await applyReminderSchedule({ reminderTime: '21:00', notificationsEnabled: false });
    expect(mockedSchedule).not.toHaveBeenCalled();
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it('schedules nothing when permission is denied', async () => {
    mockedRequest.mockResolvedValue(false);
    await applyReminderSchedule({ reminderTime: '21:00', notificationsEnabled: true });
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(mockedSchedule).not.toHaveBeenCalled();
  });
});
