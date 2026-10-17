import { goalProgress, monthsLeft } from '@/features/finance/goals/goals.progress';
import type { Goal } from '@/features/finance/goals/goals.types';

const TODAY = '2026-10-17';

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 1,
    name: 'School fees',
    kind: 'sinking',
    targetAmount: 300_000,
    targetDate: '2027-09-01',
    accountId: 4,
    monthlyAmount: 25_000,
    createdAt: '2026-10-01T08:00:00Z',
    ...overrides,
  };
}

describe('monthsLeft', () => {
  it('counts the months that can still set money aside before the target month', () => {
    expect(monthsLeft('2027-09-01', TODAY)).toBe(11);
  });

  it('leaves at least this month when the target falls in the current month', () => {
    expect(monthsLeft('2026-10-30', TODAY)).toBe(1);
  });

  it('is zero once the target date has passed', () => {
    expect(monthsLeft('2026-10-01', TODAY)).toBe(0);
  });
});

describe('goalProgress', () => {
  it('measures a goal by its wallet balance', () => {
    const p = goalProgress(goal(), 75_000, 10_000, TODAY);

    expect(p.saved).toBe(75_000);
    expect(p.remaining).toBe(225_000);
    expect(p.pct).toBe(25);
    expect(p.achieved).toBe(false);
    expect(p.savedThisMonth).toBe(10_000);
  });

  it('works out what a sinking fund needs each month to arrive on time', () => {
    const p = goalProgress(goal(), 75_000, 0, TODAY);

    expect(p.monthsLeft).toBe(11);
    expect(p.requiredMonthly).toBe(20_455); // 225 000 / 11, rounded up
    expect(p.onPace).toBe(true);
  });

  it('flags a sinking fund whose monthly amount is too small', () => {
    const p = goalProgress(goal({ monthlyAmount: 15_000 }), 75_000, 0, TODAY);

    expect(p.onPace).toBe(false);
  });

  it('asks for everything still missing once the date has passed', () => {
    const p = goalProgress(goal({ targetDate: '2026-10-01' }), 75_000, 0, TODAY);

    expect(p.isOverdue).toBe(true);
    expect(p.requiredMonthly).toBe(225_000);
  });

  it('estimates how long a buffer takes at its monthly amount', () => {
    const buffer = goal({ kind: 'buffer', targetDate: null, targetAmount: 100_000, monthlyAmount: 15_000 });
    const p = goalProgress(buffer, 40_000, 0, TODAY);

    expect(p.monthsToTarget).toBe(4); // 60 000 / 15 000, rounded up
    expect(p.requiredMonthly).toBeNull();
    expect(p.onPace).toBeNull();
  });

  it('has no end date for a buffer with nothing set aside each month', () => {
    const p = goalProgress(goal({ kind: 'buffer', targetDate: null, monthlyAmount: 0 }), 0, 0, TODAY);

    expect(p.monthsToTarget).toBeNull();
  });

  it('counts a goal reached once the wallet holds the target, capped at 100%', () => {
    const p = goalProgress(goal(), 320_000, 0, TODAY);

    expect(p.achieved).toBe(true);
    expect(p.remaining).toBe(0);
    expect(p.pct).toBe(100);
    expect(p.requiredMonthly).toBe(0);
  });

  it('never reports a negative saving when the wallet is overdrawn', () => {
    const p = goalProgress(goal(), -5_000, 0, TODAY);

    expect(p.saved).toBe(0);
    expect(p.pct).toBe(0);
  });
});
