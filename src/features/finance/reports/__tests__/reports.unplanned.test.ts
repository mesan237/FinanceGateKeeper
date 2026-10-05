import type { Expense } from '@/features/finance/expenses/expenses.types';

// Upstream services are mocked — the monthly report is pure aggregation.
jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getExpensesByDateRange: jest.fn(),
  getAllCategories: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/features/finance/expenses/expenses.unplanned', () => ({
  getUnplannedTotals: jest.fn(),
}));
jest.mock('@/features/finance/budget/budget.service', () => ({
  getMonthlyBudget: jest.fn().mockResolvedValue({ incomeTotal: 0, expensesLogged: 0 }),
}));
jest.mock('@/features/finance/budget/budget.plan', () => ({
  buildMonthlyPlan: jest.fn().mockResolvedValue({ totalBudget: 0 }),
}));
jest.mock('@/features/finance/debt/debt.service', () => ({
  getOutstandingTotals: jest.fn().mockResolvedValue({ lent: 0, owed: 0 }),
}));

import * as expensesService from '@/features/finance/expenses/expenses.service';
import * as unplannedService from '@/features/finance/expenses/expenses.unplanned';
import { getMonthlyReport } from '@/features/finance/reports/reports.service';

const mockExpensesByRange = expensesService.getExpensesByDateRange as jest.MockedFunction<
  typeof expensesService.getExpensesByDateRange
>;
const mockUnplannedTotals = unplannedService.getUnplannedTotals as jest.MockedFunction<
  typeof unplannedService.getUnplannedTotals
>;

function expense(amount: number, isUnplanned = false): Expense {
  return {
    id: 1,
    amount,
    categoryId: 1,
    subcategoryId: null,
    note: null,
    date: '2026-06-05',
    isRecurring: false,
    isUnplanned,
    accountId: null,
    createdAt: '2026-06-05T00:00:00.000Z',
  };
}

/** The current month's expenses; the comparison's own queries get none. */
function currentMonth(expenses: Expense[]) {
  mockExpensesByRange.mockResolvedValueOnce(expenses).mockResolvedValue([]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUnplannedTotals.mockResolvedValue({ count: 0, total: 0 });
});

describe('getMonthlyReport — imprévus', () => {
  it("counts the month's imprévus, their cost and their share of spending", async () => {
    currentMonth([expense(15000, true), expense(5000, true), expense(30000)]);

    const report = await getMonthlyReport('2026-06');

    expect(report.unplanned).toEqual(
      expect.objectContaining({ count: 2, total: 20000, sharePct: 40 }),
    );
  });

  it('keeps a tiny share exact rather than rounding it away to zero', async () => {
    currentMonth([expense(100, true), expense(49900)]);

    const report = await getMonthlyReport('2026-06');

    expect(report.unplanned.sharePct).toBeCloseTo(0.2, 5);
  });

  it("carries last month's imprévus for comparison", async () => {
    currentMonth([]);
    mockUnplannedTotals.mockResolvedValue({ count: 3, total: 12000 });

    const report = await getMonthlyReport('2026-06');

    expect(mockUnplannedTotals).toHaveBeenCalledWith('2026-05-01', '2026-05-31');
    expect(report.unplanned.previous).toEqual({ count: 3, total: 12000 });
  });

  it('reports a zero share when nothing was spent', async () => {
    currentMonth([]);

    const report = await getMonthlyReport('2026-06');

    expect(report.unplanned).toEqual(expect.objectContaining({ count: 0, total: 0, sharePct: 0 }));
  });
});
