import { buildBurndown, buildWeeklyTrend } from '@/features/finance/budget/budget.trend';

describe('buildWeeklyTrend', () => {
  it('buckets a month into 7-day slots, oldest first', () => {
    const trend = buildWeeklyTrend(
      [
        { date: '2026-08-01', amount: 5_000 },
        { date: '2026-08-07', amount: 3_000 },
        { date: '2026-08-08', amount: 9_000 },
      ],
      '2026-08',
    );

    expect(trend[0]).toBe(8_000);
    expect(trend[1]).toBe(9_000);
  });

  it('gives a 31-day month five buckets', () => {
    expect(buildWeeklyTrend([], '2026-08')).toHaveLength(5);
  });

  it('gives a 28-day February four buckets', () => {
    expect(buildWeeklyTrend([], '2026-02')).toHaveLength(4);
  });

  it('ignores expenses from other months', () => {
    const trend = buildWeeklyTrend([{ date: '2026-07-03', amount: 9_000 }], '2026-08');
    expect(trend.every((week) => week === 0)).toBe(true);
  });
});

describe('buildBurndown', () => {
  it('starts at the full budget on day zero', () => {
    const points = buildBurndown([], 300_000, '2026-06', '2026-06-05');

    expect(points[0]).toEqual({ day: 0, ideal: 300_000, actual: 300_000 });
  });

  it('stops at today rather than projecting to month end', () => {
    const points = buildBurndown([], 300_000, '2026-06', '2026-06-05');
    expect(points).toHaveLength(6); // days 0 through 5
  });

  it('drops the actual line by real spending, cumulatively', () => {
    const points = buildBurndown(
      [
        { date: '2026-06-01', amount: 20_000 },
        { date: '2026-06-03', amount: 10_000 },
      ],
      300_000,
      '2026-06',
      '2026-06-04',
    );

    expect(points[1].actual).toBe(280_000);
    expect(points[2].actual).toBe(280_000);
    expect(points[3].actual).toBe(270_000);
  });

  it('falls the ideal line evenly toward zero', () => {
    const points = buildBurndown([], 300_000, '2026-06', '2026-06-15');
    // Half of a 30-day month gone -> half the budget should remain.
    expect(points[15].ideal).toBe(150_000);
  });

  it('lets the actual line go negative once overspent', () => {
    const points = buildBurndown(
      [{ date: '2026-06-02', amount: 120_000 }],
      100_000,
      '2026-06',
      '2026-06-03',
    );

    expect(points[3].actual).toBe(-20_000);
  });
});
