import {
  daysElapsedInMonth,
  daysInMonth,
  daysRemainingInMonth,
  firstDayOfMonth,
  lastDayOfMonth,
  monthLabel,
  monthProgress,
  nextMonthISO,
  prevMonthISO,
  weekIndexOfDate,
  weeksInMonth,
} from '@/utils/monthMath';

describe('daysInMonth', () => {
  it('returns 30 for a 30-day month', () => {
    expect(daysInMonth('2026-06')).toBe(30);
  });

  it('returns 31 for a 31-day month', () => {
    expect(daysInMonth('2026-01')).toBe(31);
  });

  it('returns 28 for February in a non-leap year', () => {
    expect(daysInMonth('2026-02')).toBe(28);
  });

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth('2024-02')).toBe(29);
  });
});

describe('firstDayOfMonth / lastDayOfMonth', () => {
  it('returns the first calendar day', () => {
    expect(firstDayOfMonth('2026-08')).toBe('2026-08-01');
  });

  it('returns the last calendar day', () => {
    expect(lastDayOfMonth('2026-08')).toBe('2026-08-31');
  });

  it('returns the last day of a leap February', () => {
    expect(lastDayOfMonth('2024-02')).toBe('2024-02-29');
  });
});

describe('daysElapsedInMonth', () => {
  it('counts the current day as elapsed', () => {
    expect(daysElapsedInMonth('2026-08', '2026-08-07')).toBe(7);
  });

  it('returns 1 on the first of the month', () => {
    expect(daysElapsedInMonth('2026-08', '2026-08-01')).toBe(1);
  });

  it('returns the whole month once the month is in the past', () => {
    expect(daysElapsedInMonth('2026-06', '2026-08-07')).toBe(30);
  });

  it('returns 0 for a month that has not started', () => {
    expect(daysElapsedInMonth('2026-12', '2026-08-07')).toBe(0);
  });
});

describe('daysRemainingInMonth', () => {
  it('returns the days left after today', () => {
    expect(daysRemainingInMonth('2026-06', '2026-06-08')).toBe(22);
  });

  it('returns 0 on the last day of the month', () => {
    expect(daysRemainingInMonth('2026-06', '2026-06-30')).toBe(0);
  });

  it('returns 0 for a month already past', () => {
    expect(daysRemainingInMonth('2026-06', '2026-07-01')).toBe(0);
  });

  it('returns the whole month for a month not yet started', () => {
    expect(daysRemainingInMonth('2026-12', '2026-08-07')).toBe(31);
  });
});

describe('monthProgress', () => {
  it('is the elapsed share of the month', () => {
    // 15 of 30 days.
    expect(monthProgress('2026-06', '2026-06-15')).toBeCloseTo(0.5);
  });

  it('is 1 for a completed month', () => {
    expect(monthProgress('2026-06', '2026-07-04')).toBe(1);
  });

  it('is 0 for a future month', () => {
    expect(monthProgress('2027-01', '2026-08-07')).toBe(0);
  });
});

describe('prevMonthISO / nextMonthISO', () => {
  it('steps back one month', () => {
    expect(prevMonthISO('2026-08')).toBe('2026-07');
  });

  it('steps back across a year boundary', () => {
    expect(prevMonthISO('2026-01')).toBe('2025-12');
  });

  it('steps forward one month', () => {
    expect(nextMonthISO('2026-08')).toBe('2026-09');
  });

  it('steps forward across a year boundary', () => {
    expect(nextMonthISO('2026-12')).toBe('2027-01');
  });
});

describe('monthLabel', () => {
  it('formats a month as name + year', () => {
    expect(monthLabel('2026-08')).toBe('August 2026');
  });
});

describe('weekIndexOfDate / weeksInMonth', () => {
  it('puts the first seven days in week 0', () => {
    expect(weekIndexOfDate('2026-08-01')).toBe(0);
    expect(weekIndexOfDate('2026-08-07')).toBe(0);
  });

  it('starts week 1 on the eighth', () => {
    expect(weekIndexOfDate('2026-08-08')).toBe(1);
  });

  it('buckets the tail of a 31-day month into week 4', () => {
    expect(weekIndexOfDate('2026-08-31')).toBe(4);
  });

  it('counts five buckets for a 31-day month', () => {
    expect(weeksInMonth('2026-08')).toBe(5);
  });

  it('counts four buckets for a 28-day February', () => {
    expect(weeksInMonth('2026-02')).toBe(4);
  });
});
