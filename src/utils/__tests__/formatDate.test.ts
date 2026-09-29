import i18n from '@/i18n';
import {
  addMonths,
  currentMonthISO,
  daysBetween,
  formatDateLong,
  formatDateShort,
  formatSectionDate,
  toISODate,
} from '@/utils/formatDate';

describe('daysBetween', () => {
  it('counts whole days from a to b (future is positive)', () => {
    expect(daysBetween('2026-06-12', '2026-06-15')).toBe(3);
  });

  it('is negative when b is before a', () => {
    expect(daysBetween('2026-06-15', '2026-06-12')).toBe(-3);
  });

  it('is zero for the same day', () => {
    expect(daysBetween('2026-06-12', '2026-06-12')).toBe(0);
  });

  it('counts across a month boundary', () => {
    expect(daysBetween('2026-06-28', '2026-07-01')).toBe(3);
  });

  it('counts across a year boundary', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('is UTC-stable when given Dates with late times', () => {
    expect(
      daysBetween(new Date('2026-06-12T23:00:00Z'), new Date('2026-06-13T01:00:00Z')),
    ).toBe(1);
  });
});

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

describe('localized date labels', () => {
  it('writes French month names when asked for French', () => {
    expect(formatDateShort('2026-06-12', 'fr')).toBe('12 juin');
    expect(formatDateLong('2026-02-03', 'fr')).toBe('3 février 2026');
  });

  it('writes French weekday section headers', () => {
    expect(formatSectionDate('2026-06-08', '2026-06-12', 'fr')).toBe('lun. 8 juin');
    expect(formatSectionDate('2026-06-12', '2026-06-12', 'fr')).toBe("Aujourd'hui");
    expect(formatSectionDate('2026-06-11', '2026-06-12', 'fr')).toBe('Hier');
  });

  it('keeps the English labels by default', () => {
    expect(formatSectionDate('2026-06-08', '2026-06-12')).toBe('Mon 8 Jun');
    expect(formatSectionDate('2026-06-12', '2026-06-12')).toBe('Today');
  });

  it('follows the active app language when no language is passed', async () => {
    await i18n.changeLanguage('fr');
    try {
      expect(formatDateShort('2026-08-01')).toBe('1 août');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
