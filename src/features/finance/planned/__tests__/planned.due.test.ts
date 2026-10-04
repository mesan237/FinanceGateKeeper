import {
  DUE_SOON_DAYS,
  daysUntil,
  dueStatus,
  effectiveDueDate,
  needsAttention,
  postponedDate,
} from '@/features/finance/planned/planned.due';

const TODAY = '2026-10-04';

describe('daysUntil', () => {
  it('counts whole calendar days, negative once the date has passed', () => {
    expect(daysUntil('2026-10-07', TODAY)).toBe(3);
    expect(daysUntil(TODAY, TODAY)).toBe(0);
    expect(daysUntil('2026-10-01', TODAY)).toBe(-3);
  });

  it('crosses month and year boundaries', () => {
    expect(daysUntil('2026-11-01', '2026-10-31')).toBe(1);
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
  });
});

describe('dueStatus', () => {
  it('is overdue once the day has passed', () => {
    expect(dueStatus('2026-10-03', TODAY)).toBe('overdue');
  });

  it('is today on the day itself', () => {
    expect(dueStatus(TODAY, TODAY)).toBe('today');
  });

  it(`is soon within ${DUE_SOON_DAYS} days`, () => {
    expect(dueStatus('2026-10-05', TODAY)).toBe('soon');
    expect(dueStatus('2026-10-07', TODAY)).toBe('soon');
  });

  it('is later beyond the warning window', () => {
    expect(dueStatus('2026-10-08', TODAY)).toBe('later');
  });
});

describe('needsAttention', () => {
  it('flags overdue, today and soon, but not later', () => {
    expect(needsAttention('overdue')).toBe(true);
    expect(needsAttention('today')).toBe(true);
    expect(needsAttention('soon')).toBe(true);
    expect(needsAttention('later')).toBe(false);
  });
});

describe('effectiveDueDate', () => {
  it("prefers the item's own date", () => {
    expect(effectiveDueDate('2026-10-06', '2026-10-10')).toBe('2026-10-06');
  });

  it("falls back to the list's due date", () => {
    expect(effectiveDueDate(null, '2026-10-10')).toBe('2026-10-10');
  });

  it('is null when neither has a date', () => {
    expect(effectiveDueDate(null, null)).toBeNull();
  });
});

describe('postponedDate', () => {
  it('moves a date that is still ahead by the given days', () => {
    expect(postponedDate('2026-10-06', TODAY, 7)).toBe('2026-10-13');
  });

  it('counts from today for an overdue date, so the new date is in the future', () => {
    expect(postponedDate('2026-09-28', TODAY, 1)).toBe('2026-10-05');
  });
});
