import { buildDailyReminders, REMINDER_DAYS_AHEAD } from '@/notifications/triggers/dailyReminder';
import { toISODate } from '@/utils/formatDate';

/** Local wall-clock time, so the test reads the same in any timezone. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 7, day, hour, minute);

describe('buildDailyReminders (VS-57)', () => {
  it('plans one dated reminder a day at the chosen time, starting today', () => {
    const reminders = buildDailyReminders('21:00', at(15, 9), new Set());

    expect(reminders).toHaveLength(REMINDER_DAYS_AHEAD);
    expect(reminders[0].scheduledAt).toEqual(at(15, 21));
    expect(reminders[1].scheduledAt).toEqual(at(16, 21));
    expect(reminders.every((r) => r.type === 'dailyReminder' && r.schedule === undefined)).toBe(true);
    expect(reminders[0].title.length).toBeGreaterThan(0);
  });

  it('skips today once something is logged today', () => {
    const reminders = buildDailyReminders('21:00', at(15, 9), new Set([toISODate(at(15, 21))]));

    expect(reminders[0].scheduledAt).toEqual(at(16, 21));
    expect(reminders).toHaveLength(REMINDER_DAYS_AHEAD - 1);
  });

  it('skips any later day that already has an entry', () => {
    const reminders = buildDailyReminders('21:00', at(15, 9), new Set([toISODate(at(17, 21))]));

    expect(reminders.map((r) => r.scheduledAt?.getDate()).slice(0, 3)).toEqual([15, 16, 18]);
  });

  it('starts tomorrow once today’s reminder time has passed', () => {
    const reminders = buildDailyReminders('07:05', at(15, 7, 5), new Set());

    expect(reminders[0].scheduledAt).toEqual(at(16, 7, 5));
  });

  it('rejects a malformed time', () => {
    expect(() => buildDailyReminders('9pm', at(15, 9), new Set())).toThrow();
    expect(() => buildDailyReminders('24:00', at(15, 9), new Set())).toThrow();
    expect(() => buildDailyReminders('12:60', at(15, 9), new Set())).toThrow();
  });
});
