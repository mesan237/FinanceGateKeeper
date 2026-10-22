import { planNextMonth } from '@/features/finance/budget/budget.nextMonth';
import type { CategoryDetail } from '@/features/finance/budget/budget.types';

function detail(overrides: Partial<CategoryDetail> = {}): CategoryDetail {
  return {
    categoryId: 1,
    categoryName: 'Food',
    month: '2026-08',
    spent: 60_000,
    parts: [],
    repeats: [],
    kinds: { fixed: 0, variable: 60_000, unexpected: 0 },
    average: null,
    ...overrides,
  };
}

describe('planNextMonth — above a usual month', () => {
  it('aims for the usual month, rounded to 500 FCFA', () => {
    const plan = planNextMonth(detail({ average: 50_200 }), 60_000);

    expect(plan).toMatchObject({ method: 'usual', current: 60_000, target: 50_000, changePct: -17 });
  });

  it('names the subcategories above their usual, biggest saving first', () => {
    const plan = planNextMonth(
      detail({
        average: 40_000,
        parts: [
          { subcategoryId: 2, name: 'Market', amount: 30_000, count: 4, sharePct: 50, usual: 28_000 },
          { subcategoryId: 3, name: 'Restaurant', amount: 20_000, count: 5, sharePct: 33, usual: 8_000 },
          { subcategoryId: null, name: null, amount: 10_000, count: 2, sharePct: 17, usual: 4_000 },
        ],
      }),
      60_000,
    );

    expect(plan?.steps).toEqual([
      { kind: 'backToUsual', name: 'Restaurant', saving: 12_000 },
      { kind: 'backToUsual', name: null, saving: 6_000 },
    ]);
  });

  it('compares parts on the month’s pace when the month is still running', () => {
    // 30,000 spent so far, heading for 60,000: Restaurant's 10,000 so far reads as 20,000.
    const plan = planNextMonth(
      detail({
        spent: 30_000,
        average: 40_000,
        parts: [{ subcategoryId: 3, name: 'Restaurant', amount: 10_000, count: 3, sharePct: 33, usual: 8_000 }],
      }),
      60_000,
    );

    expect(plan?.steps).toEqual([{ kind: 'backToUsual', name: 'Restaurant', saving: 12_000 }]);
  });

  it('never aims below the fixed bills', () => {
    const plan = planNextMonth(
      detail({ average: 20_000, kinds: { fixed: 35_000, variable: 25_000, unexpected: 0 } }),
      60_000,
    );

    expect(plan).toMatchObject({ method: 'usual', target: 35_000, fixed: 35_000 });
  });
});

describe('planNextMonth — at or below a usual month', () => {
  it('trims day-to-day spending by a tenth', () => {
    const plan = planNextMonth(
      detail({ average: 62_000, kinds: { fixed: 20_000, variable: 40_000, unexpected: 0 } }),
      60_000,
    );

    expect(plan).toMatchObject({ method: 'trim', target: 56_000, changePct: -7 });
  });

  it('trims too when there is no usual month yet', () => {
    expect(planNextMonth(detail(), 60_000)).toMatchObject({ method: 'trim', target: 54_000 });
  });

  it('says there is nothing to cut when it is all fixed bills', () => {
    const plan = planNextMonth(
      detail({ kinds: { fixed: 60_000, variable: 0, unexpected: 0 } }),
      60_000,
    );

    expect(plan).toMatchObject({ method: 'fixed', target: 60_000, steps: [] });
  });
});

describe('planNextMonth — repeated purchases', () => {
  it('suggests skipping one in four of a purchase that keeps coming back', () => {
    const plan = planNextMonth(detail({ repeats: [{ label: 'Taxi', count: 18, total: 27_000 }] }), 60_000);

    expect(plan?.steps).toEqual([{ kind: 'fewerRepeats', label: 'Taxi', count: 18, saving: 6_750 }]);
  });

  it('leaves out a repeat bought fewer than four times', () => {
    const plan = planNextMonth(detail({ repeats: [{ label: 'Taxi', count: 3, total: 4_500 }] }), 60_000);

    expect(plan?.steps).toEqual([]);
  });
});

it('has no plan for a month with no spending', () => {
  expect(planNextMonth(detail({ spent: 0, kinds: { fixed: 0, variable: 0, unexpected: 0 } }), 0)).toBeNull();
});
