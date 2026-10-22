import { firstWeekdayOnOrAfter, nextWeekday } from '@/utils/weekdays';

// 23 Oct 2026 is a Friday.
describe('weekday dates (VS-60)', () => {
  it('moves to the next day within the week', () => {
    expect(nextWeekday('2026-10-21')).toBe('2026-10-22');
  });

  it('jumps from Friday over the weekend to Monday', () => {
    expect(nextWeekday('2026-10-23')).toBe('2026-10-26');
  });

  it('crosses month and year ends', () => {
    expect(nextWeekday('2026-10-30')).toBe('2026-11-02');
    expect(nextWeekday('2026-12-31')).toBe('2027-01-01');
  });

  it('keeps a weekday and rolls a weekend day to Monday', () => {
    expect(firstWeekdayOnOrAfter('2026-10-23')).toBe('2026-10-23');
    expect(firstWeekdayOnOrAfter('2026-10-24')).toBe('2026-10-26');
    expect(firstWeekdayOnOrAfter('2026-10-25')).toBe('2026-10-26');
  });
});
