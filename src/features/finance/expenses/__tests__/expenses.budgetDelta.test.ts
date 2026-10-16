import { editBudgetDeltas, monthOf } from '@/features/finance/expenses/expenses.budgetDelta';

const ORIGINAL = { amount: 10000, categoryId: 1, date: '2026-10-05' };

describe('monthOf', () => {
  it('returns the YYYY-MM month of a YYYY-MM-DD date', () => {
    expect(monthOf('2026-09-30')).toBe('2026-09');
  });
});

describe('editBudgetDeltas', () => {
  it('asks both checks about the increase only when month and category are unchanged', () => {
    expect(editBudgetDeltas(ORIGINAL, { ...ORIGINAL, amount: 12000 })).toEqual({
      month: '2026-10',
      monthIncrease: 2000,
      categoryIncrease: 2000,
    });
  });

  it('reports no increase when the amount goes down', () => {
    const deltas = editBudgetDeltas(ORIGINAL, { ...ORIGINAL, amount: 8000 });
    expect(deltas.monthIncrease).toBe(-2000);
    expect(deltas.categoryIncrease).toBe(-2000);
  });

  it('checks the new category against the full amount when the category changes', () => {
    expect(editBudgetDeltas(ORIGINAL, { ...ORIGINAL, categoryId: 2 })).toEqual({
      month: '2026-10',
      monthIncrease: 0,
      categoryIncrease: 10000,
    });
  });

  it('checks the full amount against the new month when the date moves to another month', () => {
    expect(editBudgetDeltas(ORIGINAL, { ...ORIGINAL, date: '2026-09-28', amount: 11000 })).toEqual({
      month: '2026-09',
      monthIncrease: 11000,
      categoryIncrease: 11000,
    });
  });

  it('treats a date change inside the same month as no move', () => {
    const deltas = editBudgetDeltas(ORIGINAL, { ...ORIGINAL, date: '2026-10-20' });
    expect(deltas).toEqual({ month: '2026-10', monthIncrease: 0, categoryIncrease: 0 });
  });
});
