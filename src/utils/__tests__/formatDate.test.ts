import { formatIsoDate, todayIso } from '@/utils/formatDate';

describe('formatIsoDate', () => {
  it('formats an ISO date as "DD MMM YYYY"', () => {
    expect(formatIsoDate('2026-05-30')).toBe('30 May 2026');
  });

  it('pads single-digit days with a leading zero', () => {
    expect(formatIsoDate('2026-01-01')).toBe('01 Jan 2026');
  });

  it('throws when the input is not a YYYY-MM-DD ISO date', () => {
    expect(() => formatIsoDate('not-a-date')).toThrow();
  });
});

describe('todayIso', () => {
  it('returns the local date as YYYY-MM-DD', () => {
    const originalNow = Date.now;
    Date.now = () => new Date(2026, 4, 30, 10, 0, 0).getTime();
    try {
      expect(todayIso()).toBe('2026-05-30');
    } finally {
      Date.now = originalNow;
    }
  });
});
