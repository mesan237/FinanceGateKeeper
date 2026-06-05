import {
  buildZeroDayNotification,
  shouldTriggerZeroDay,
} from '@/notifications/triggers/zeroDayCheck';

describe('shouldTriggerZeroDay', () => {
  it('is true only when there are no expenses and no confirmation', () => {
    expect(shouldTriggerZeroDay({ hasExpensesToday: false, zeroDayConfirmed: false })).toBe(true);
  });

  it('is false when the day already has expenses', () => {
    expect(shouldTriggerZeroDay({ hasExpensesToday: true, zeroDayConfirmed: false })).toBe(false);
  });

  it('is false when a zero-day is already confirmed', () => {
    expect(shouldTriggerZeroDay({ hasExpensesToday: false, zeroDayConfirmed: true })).toBe(false);
    expect(shouldTriggerZeroDay({ hasExpensesToday: true, zeroDayConfirmed: true })).toBe(false);
  });
});

describe('buildZeroDayNotification', () => {
  it('builds a zero-day payload with non-empty copy', () => {
    const payload = buildZeroDayNotification();
    expect(payload.type).toBe('zeroDayCheck');
    expect(payload.title.length).toBeGreaterThan(0);
    expect(payload.body.length).toBeGreaterThan(0);
  });
});
