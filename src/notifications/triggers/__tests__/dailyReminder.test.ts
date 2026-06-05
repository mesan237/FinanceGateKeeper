import { buildDailyReminder } from '@/notifications/triggers/dailyReminder';

describe('buildDailyReminder', () => {
  it('builds a repeating daily payload at the given time', () => {
    const payload = buildDailyReminder('21:00');
    expect(payload.type).toBe('dailyReminder');
    expect(payload.schedule).toEqual({ hour: 21, minute: 0, repeats: true });
    expect(payload.title.length).toBeGreaterThan(0);
    expect(payload.body.length).toBeGreaterThan(0);
  });

  it('parses non-zero minutes', () => {
    expect(buildDailyReminder('07:05').schedule).toEqual({ hour: 7, minute: 5, repeats: true });
  });

  it('rejects malformed times', () => {
    expect(() => buildDailyReminder('9pm')).toThrow();
    expect(() => buildDailyReminder('24:00')).toThrow();
    expect(() => buildDailyReminder('12:60')).toThrow();
  });
});
