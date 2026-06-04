import { formatDateLong, formatDateShort, toISODate } from '@/utils/formatDate';

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
