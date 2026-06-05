import {
  addMonths,
  currentMonthISO,
  formatDateLong,
  formatDateShort,
  toISODate,
} from '@/utils/formatDate';

describe('addMonths', () => {
  it('adds whole months and returns a UTC-stable YYYY-MM-DD string', () => {
    expect(addMonths('2026-06-15', 3)).toBe('2026-09-15');
  });

  it('crosses the year boundary', () => {
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('accepts a Date and is UTC-stable for a late time', () => {
    expect(addMonths(new Date('2026-06-30T23:59:00Z'), 1)).toBe('2026-07-30');
  });

  it('adding zero months returns the same day', () => {
    expect(addMonths('2026-06-15', 0)).toBe('2026-06-15');
  });
});

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
