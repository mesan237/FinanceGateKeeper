import {
  buildBurndown,
  buildCarryChain,
  buildCategoryProgress,
  buildOverallProgress,
  buildWeeklyTrend,
  budgetHealth,
  consumedPct,
  dailyAverage,
  expectedToDate,
  projectSpend,
  safeDailySpend,
} from '@/features/finance/budget/budget.progress';

describe('consumedPct', () => {
  it('reports the share of the budget spent', () => {
    expect(consumedPct(25_000, 100_000)).toBe(25);
  });

  it('exceeds 100 when overspent, so the overage stays visible', () => {
    expect(consumedPct(120_000, 100_000)).toBe(120);
  });

  it('returns 0 when nothing is budgeted', () => {
    expect(consumedPct(5_000, 0)).toBe(0);
  });
});

describe('dailyAverage', () => {
  it('divides spend by elapsed days', () => {
    expect(dailyAverage(70_000, 7)).toBe(10_000);
  });

  it('returns 0 before any day has elapsed', () => {
    expect(dailyAverage(70_000, 0)).toBe(0);
  });
});

describe('projectSpend', () => {
  it('extends the run-rate to the end of the month', () => {
    // 10,000/day over 10 days -> 300,000 across a 30-day month.
    expect(projectSpend(100_000, 10, 30)).toBe(300_000);
  });

  it('equals actual spend once the month is fully elapsed', () => {
    expect(projectSpend(240_000, 30, 30)).toBe(240_000);
  });

  it('returns 0 for a month that has not started', () => {
    expect(projectSpend(0, 0, 31)).toBe(0);
  });
});

describe('expectedToDate', () => {
  it('is the even-pace spend for the days elapsed', () => {
    expect(expectedToDate(300_000, 10, 30)).toBe(100_000);
  });

  it('never exceeds the full budget', () => {
    expect(expectedToDate(300_000, 40, 30)).toBe(300_000);
  });

  it('returns 0 with no budget', () => {
    expect(expectedToDate(0, 10, 30)).toBe(0);
  });
});

describe('safeDailySpend', () => {
  it('spreads what is left over the days that remain', () => {
    expect(safeDailySpend(100_000, 10)).toBe(10_000);
  });

  it('makes the whole remainder spendable on the last day', () => {
    expect(safeDailySpend(12_000, 0)).toBe(12_000);
  });

  it('is 0 once overspent', () => {
    expect(safeDailySpend(-5_000, 10)).toBe(0);
  });
});

describe('budgetHealth', () => {
  it('is over once spending passes the budget', () => {
    expect(budgetHealth(110_000, 100_000, 20, 30)).toBe('over');
  });

  it('treats landing exactly on budget as not over', () => {
    expect(budgetHealth(100_000, 100_000, 30, 30)).toBe('on_track');
  });

  it('is at risk when the run-rate projects past the budget, even at low consumption', () => {
    // 45,000 by day 6 of 30 projects to 225,000 against a 100,000 budget.
    expect(budgetHealth(45_000, 100_000, 6, 30)).toBe('at_risk');
  });

  it('is at risk at 80%+ consumed with days still to fund', () => {
    // Day 29 of 30: the projection lands just under, but 85% is gone with a day left.
    expect(budgetHealth(85_000, 100_000, 29, 30)).toBe('at_risk');
  });

  it('is on track when the pace lands inside the budget', () => {
    // 30,000 by day 10 of 30 projects to 90,000 against 100,000.
    expect(budgetHealth(30_000, 100_000, 10, 30)).toBe('on_track');
  });

  it('is on track when nothing is budgeted, rather than crying wolf', () => {
    expect(budgetHealth(5_000, 0, 10, 30)).toBe('on_track');
  });
});

describe('buildCarryChain', () => {
  it('carries an unspent remainder into the next month', () => {
    const carry = buildCarryChain([
      { month: '2026-06', allocated: 40_000, spent: 30_000, rolloverEnabled: true },
      { month: '2026-07', allocated: 40_000, spent: 0, rolloverEnabled: true },
    ]);
    expect(carry.get('2026-06')).toBe(0);
    expect(carry.get('2026-07')).toBe(10_000);
  });

  it('accumulates across several months', () => {
    const carry = buildCarryChain([
      { month: '2026-06', allocated: 40_000, spent: 30_000, rolloverEnabled: true },
      { month: '2026-07', allocated: 40_000, spent: 35_000, rolloverEnabled: true },
      { month: '2026-08', allocated: 40_000, spent: 0, rolloverEnabled: true },
    ]);
    // 10,000 left in June, plus 5,000 left in July on top of it.
    expect(carry.get('2026-08')).toBe(15_000);
  });

  it('carries overspend forward as a negative balance', () => {
    const carry = buildCarryChain([
      { month: '2026-06', allocated: 40_000, spent: 52_000, rolloverEnabled: true },
      { month: '2026-07', allocated: 40_000, spent: 0, rolloverEnabled: true },
    ]);
    expect(carry.get('2026-07')).toBe(-12_000);
  });

  it('resets the chain in a month where rollover is off', () => {
    const carry = buildCarryChain([
      { month: '2026-06', allocated: 40_000, spent: 10_000, rolloverEnabled: true },
      { month: '2026-07', allocated: 40_000, spent: 0, rolloverEnabled: false },
      { month: '2026-08', allocated: 40_000, spent: 0, rolloverEnabled: true },
    ]);
    expect(carry.get('2026-07')).toBe(0);
    // August inherits July's own surplus only — June's 30,000 was dropped.
    expect(carry.get('2026-08')).toBe(40_000);
  });

  it('never carries into the first recorded month', () => {
    const carry = buildCarryChain([
      { month: '2026-06', allocated: 40_000, spent: 0, rolloverEnabled: true },
    ]);
    expect(carry.get('2026-06')).toBe(0);
  });
});

describe('buildCategoryProgress', () => {
  it('derives every display figure for a mid-month envelope', () => {
    const progress = buildCategoryProgress(
      {
        categoryId: 1,
        categoryName: 'Food',
        allocated: 60_000,
        carriedIn: 0,
        spent: 30_000,
        rolloverEnabled: false,
      },
      '2026-06',
      '2026-06-10',
    );

    expect(progress.available).toBe(60_000);
    expect(progress.remaining).toBe(30_000);
    expect(progress.consumedPct).toBe(50);
    expect(progress.dailyAverage).toBe(3_000);
    expect(progress.projected).toBe(90_000); // 3,000/day x 30 days
    expect(progress.expectedToDate).toBe(20_000); // 60,000 x 10/30
    expect(progress.health).toBe('at_risk'); // projection overshoots
  });

  it('folds carried-in budget into available spending power', () => {
    const progress = buildCategoryProgress(
      {
        categoryId: 1,
        categoryName: 'Food',
        allocated: 40_000,
        carriedIn: 10_000,
        spent: 20_000,
        rolloverEnabled: true,
      },
      '2026-06',
      '2026-06-15',
    );

    expect(progress.available).toBe(50_000);
    expect(progress.remaining).toBe(30_000);
  });

  it('reports a negative remaining once overspent', () => {
    const progress = buildCategoryProgress(
      {
        categoryId: 2,
        categoryName: 'Transport',
        allocated: 20_000,
        carriedIn: 0,
        spent: 26_000,
        rolloverEnabled: false,
      },
      '2026-06',
      '2026-06-20',
    );

    expect(progress.remaining).toBe(-6_000);
    expect(progress.health).toBe('over');
  });
});

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

describe('buildOverallProgress', () => {
  it('derives the month-level view', () => {
    const overall = buildOverallProgress(300_000, 100_000, '2026-06', '2026-06-10');

    expect(overall.remaining).toBe(200_000);
    expect(overall.daysElapsed).toBe(10);
    expect(overall.daysRemaining).toBe(20);
    expect(overall.dailyAverage).toBe(10_000);
    expect(overall.projected).toBe(300_000);
    expect(overall.safeDailySpend).toBe(10_000);
  });

  it('uses the same health rule as the envelopes', () => {
    expect(buildOverallProgress(100_000, 45_000, '2026-06', '2026-06-06').health).toBe('at_risk');
    expect(buildOverallProgress(100_000, 110_000, '2026-06', '2026-06-20').health).toBe('over');
  });

  it('treats a fully elapsed past month as settled, not projected', () => {
    const overall = buildOverallProgress(300_000, 240_000, '2026-06', '2026-08-07');

    expect(overall.daysElapsed).toBe(30);
    expect(overall.daysRemaining).toBe(0);
    expect(overall.projected).toBe(240_000);
    expect(overall.health).toBe('on_track');
  });
});
