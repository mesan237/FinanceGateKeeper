import { cycleDate } from '@/utils/cycleDate';

describe('cycleDate', () => {
  it('steps a weekly cycle seven days at a time', () => {
    expect(cycleDate('2026-10-05', 'weekly', 1)).toBe('2026-10-05');
    expect(cycleDate('2026-10-05', 'weekly', 4)).toBe('2026-10-26');
  });

  it('keeps a monthly cycle on its day, clamped in short months without drifting', () => {
    expect(cycleDate('2026-01-31', 'monthly', 2)).toBe('2026-02-28');
    expect(cycleDate('2026-01-31', 'monthly', 3)).toBe('2026-03-31');
    expect(cycleDate('2026-11-15', 'monthly', 3)).toBe('2027-01-15');
  });
});
