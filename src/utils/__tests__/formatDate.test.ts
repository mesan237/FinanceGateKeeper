import { currentMonthISO, formatDateLong, formatDateShort, toISODate } from '@/utils/formatDate';

describe('toISODate', () => {
  it('returns a UTC-stable YYYY-MM-DD string', () => {
    expect(toISODate(new Date('2026-06-12T15:00:00Z'))).toBe('2026-06-12');
  });

  it('does not drift across the day boundary for a late UTC time', () => {
    expect(toISODate(new Date('2026-06-12T23:59:00Z'))).toBe('2026-06-12');
  });
});

describe('formatDateShort', () => {
  it('formats a YYYY-MM-DD string as day and short month', () => {
    expect(formatDateShort('2026-06-12')).toBe('12 Jun');
  });

  it('formats a Date the same way', () => {
    expect(formatDateShort(new Date('2026-01-03T10:00:00Z'))).toBe('3 Jan');
  });
});

describe('formatDateLong', () => {
  it('formats a YYYY-MM-DD string as day, full month, and year', () => {
    expect(formatDateLong('2026-06-12')).toBe('12 June 2026');
  });
});

describe('currentMonthISO', () => {
  // Faked timers + a frozen system time so the assertion is deterministic
  // regardless of when the suite runs.
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the current month as YYYY-MM in UTC', () => {
    jest.setSystemTime(new Date('2026-06-12T15:00:00Z'));
    expect(currentMonthISO()).toBe('2026-06-12'.slice(0, 7));
  });

  it('does not drift across the month boundary for a late UTC time', () => {
    jest.setSystemTime(new Date('2026-06-30T23:59:59Z'));
    expect(currentMonthISO()).toBe('2026-06');
  });

  it('pads single-digit months to two digits', () => {
    jest.setSystemTime(new Date('2026-01-05T00:00:00Z'));
    expect(currentMonthISO()).toBe('2026-01');
  });
});
