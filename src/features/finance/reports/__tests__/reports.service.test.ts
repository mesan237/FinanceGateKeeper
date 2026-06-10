import type { Expense } from '@/features/finance/expenses/expenses.types';
import type { Income } from '@/features/finance/income/income.types';
import type { Category } from '@/features/finance/expenses/expenses.types';
import type { MonthlyBudget } from '@/features/finance/budget/budget.types';
import type { Fund } from '@/features/finance/funds/funds.types';
import type { Project } from '@/features/finance/projects/projects.types';
import type { OutstandingTotals } from '@/features/finance/debt/debt.types';

// All upstream service modules are mocked — reports.service is pure aggregation.
jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getExpensesByDateRange: jest.fn(),
  getAllCategories: jest.fn(),
}));
jest.mock('@/features/finance/income/income.service', () => ({
  getIncomeByDateRange: jest.fn(),
}));
jest.mock('@/features/finance/budget/budget.service', () => ({
  getMonthlyBudget: jest.fn(),
}));
jest.mock('@/features/finance/funds/funds.service', () => ({
  getOrCreateFunds: jest.fn(),
  getFundProgress: jest.requireActual<typeof import('@/features/finance/funds/funds.service')>(
    '@/features/finance/funds/funds.service',
  ).getFundProgress,
}));
jest.mock('@/features/finance/projects/projects.service', () => ({
  getProjects: jest.fn(),
}));
jest.mock('@/features/finance/debt/debt.service', () => ({
  getOutstandingTotals: jest.fn(),
}));

import {
  getWeeklyReport,
  getMonthlyReport,
  getMonthComparison,
  generateSuggestions,
} from '@/features/finance/reports/reports.service';
import * as expensesService from '@/features/finance/expenses/expenses.service';
import * as incomeService from '@/features/finance/income/income.service';
import * as budgetService from '@/features/finance/budget/budget.service';
import * as fundsService from '@/features/finance/funds/funds.service';
import * as projectsService from '@/features/finance/projects/projects.service';
import * as debtService from '@/features/finance/debt/debt.service';

const mockExpensesByRange = expensesService.getExpensesByDateRange as jest.MockedFunction<
  typeof expensesService.getExpensesByDateRange
>;
const mockCategories = expensesService.getAllCategories as jest.MockedFunction<
  typeof expensesService.getAllCategories
>;
const mockIncomeByRange = incomeService.getIncomeByDateRange as jest.MockedFunction<
  typeof incomeService.getIncomeByDateRange
>;
const mockMonthlyBudget = budgetService.getMonthlyBudget as jest.MockedFunction<
  typeof budgetService.getMonthlyBudget
>;
const mockFunds = fundsService.getOrCreateFunds as jest.MockedFunction<
  typeof fundsService.getOrCreateFunds
>;
const mockProjects = projectsService.getProjects as jest.MockedFunction<
  typeof projectsService.getProjects
>;
const mockDebt = debtService.getOutstandingTotals as jest.MockedFunction<
  typeof debtService.getOutstandingTotals
>;

function expense(partial: Partial<Expense> & Pick<Expense, 'amount' | 'categoryId' | 'date'>): Expense {
  return {
    id: 1,
    subcategoryId: null,
    note: null,
    isRecurring: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...partial,
  };
}

function income(amount: number, date: string): Income {
  return {
    id: 1,
    amount,
    source: 'salary',
    note: null,
    date,
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

const CATEGORIES: Category[] = [
  { id: 1, name: 'Food', parentId: null, isDefault: true, isHidden: false },
  { id: 2, name: 'Transport', parentId: null, isDefault: true, isHidden: false },
  { id: 3, name: 'Shopping', parentId: null, isDefault: true, isHidden: false },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockCategories.mockResolvedValue(CATEGORIES);
  mockIncomeByRange.mockResolvedValue([]);
});

describe('getWeeklyReport', () => {
  it('totalSpent equals the sum of all expense amounts in the range', async () => {
    mockExpensesByRange.mockResolvedValue([
      expense({ amount: 5000, categoryId: 1, date: '2026-06-08' }),
      expense({ amount: 3000, categoryId: 2, date: '2026-06-09' }),
      expense({ amount: 2000, categoryId: 1, date: '2026-06-10' }),
    ]);
    const report = await getWeeklyReport('2026-06-08');
    expect(report.totalSpent).toBe(10000);
    expect(report.weekStart).toBe('2026-06-08');
    expect(report.weekEnd).toBe('2026-06-14');
  });

  it('topCategories is sorted descending by amount; pct values sum to 100', async () => {
    mockExpensesByRange.mockResolvedValue([
      expense({ amount: 2000, categoryId: 1, date: '2026-06-08' }),
      expense({ amount: 5000, categoryId: 2, date: '2026-06-09' }),
      expense({ amount: 3000, categoryId: 3, date: '2026-06-10' }),
    ]);
    const report = await getWeeklyReport('2026-06-08');
    expect(report.topCategories.map((c) => c.amount)).toEqual([5000, 3000, 2000]);
    const pctSum = report.topCategories.reduce((s, c) => s + c.pct, 0);
    expect(pctSum).toBeCloseTo(100, 5);
  });

  it('peakDay is the highest-spend day; null when there are no expenses', async () => {
    mockExpensesByRange.mockResolvedValue([
      expense({ amount: 1000, categoryId: 1, date: '2026-06-08' }),
      expense({ amount: 9000, categoryId: 1, date: '2026-06-11' }),
    ]);
    const report = await getWeeklyReport('2026-06-08');
    expect(report.peakDay).toEqual({ date: '2026-06-11', amount: 9000 });

    mockExpensesByRange.mockResolvedValue([]);
    const empty = await getWeeklyReport('2026-06-08');
    expect(empty.peakDay).toBeNull();
    expect(empty.totalSpent).toBe(0);
  });

  it('spendingByDay has exactly 7 entries Mon→Sun, zero-filled for empty days', async () => {
    mockExpensesByRange.mockResolvedValue([
      expense({ amount: 1000, categoryId: 1, date: '2026-06-08' }),
      expense({ amount: 4000, categoryId: 1, date: '2026-06-14' }),
    ]);
    const report = await getWeeklyReport('2026-06-08');
    expect(report.spendingByDay).toHaveLength(7);
    expect(report.spendingByDay[0]).toEqual({ date: '2026-06-08', amount: 1000 });
    expect(report.spendingByDay[1]).toEqual({ date: '2026-06-09', amount: 0 });
    expect(report.spendingByDay[6]).toEqual({ date: '2026-06-14', amount: 4000 });
  });
});

const BUDGET: MonthlyBudget = {
  month: '2026-06',
  incomeTotal: 400000,
  allocation: {
    id: 1,
    month: '2026-06',
    emergencyFundPct: 10,
    savingsPct: 10,
    projectsPct: 15,
    expensesPct: 65,
    priorityOrder: ['emergency_fund', 'savings', 'projects', 'expenses'],
    isLocked: true,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  breakdown: { emergencyFund: 40000, savings: 40000, projects: 60000, expenses: 260000 },
  expensesLogged: 50000,
  expensesRemaining: 210000,
};

const FUNDS: Fund[] = [
  {
    id: 1,
    type: 'emergency',
    targetAmount: 100000,
    currentAmount: 40000,
    isTargetMet: false,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 2,
    type: 'savings',
    targetAmount: null,
    currentAmount: 25000,
    isTargetMet: false,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];

const PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Laptop',
    targetAmount: 500000,
    fundedAmount: 250000,
    priorityRank: 1,
    deadline: null,
    status: 'active',
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Done thing',
    targetAmount: 10000,
    fundedAmount: 10000,
    priorityRank: 2,
    deadline: null,
    status: 'completed',
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];

const DEBT: OutstandingTotals = { lent: 30000, owed: 12000 };

describe('getMonthlyReport', () => {
  beforeEach(() => {
    mockMonthlyBudget.mockResolvedValue(BUDGET);
    mockFunds.mockResolvedValue(FUNDS);
    mockProjects.mockResolvedValue(PROJECTS);
    mockDebt.mockResolvedValue(DEBT);
  });

  it('expensePerformance.actual matches the sum of mocked expenses', async () => {
    // current month expenses, then previous month (comparison) — both resolved.
    mockExpensesByRange
      .mockResolvedValueOnce([
        expense({ amount: 30000, categoryId: 1, date: '2026-06-05' }),
        expense({ amount: 20000, categoryId: 2, date: '2026-06-06' }),
      ])
      .mockResolvedValue([]);
    const report = await getMonthlyReport('2026-06');
    expect(report.expensePerformance.actual).toBe(50000);
    expect(report.expensePerformance.planned).toBe(260000);
    expect(report.expensePerformance.remaining).toBe(210000);
  });

  it('categoryBreakdown pct values sum to 100', async () => {
    mockExpensesByRange
      .mockResolvedValueOnce([
        expense({ amount: 30000, categoryId: 1, date: '2026-06-05' }),
        expense({ amount: 20000, categoryId: 2, date: '2026-06-06' }),
        expense({ amount: 10000, categoryId: 3, date: '2026-06-07' }),
      ])
      .mockResolvedValue([]);
    const report = await getMonthlyReport('2026-06');
    const pctSum = report.categoryBreakdown.reduce((s, c) => s + c.pct, 0);
    expect(pctSum).toBeCloseTo(100, 5);
  });

  it('excludes completed projects from projectProgress', async () => {
    mockExpensesByRange.mockResolvedValue([]);
    const report = await getMonthlyReport('2026-06');
    expect(report.projectProgress.map((p) => p.id)).toEqual([1]);
    expect(report.projectProgress[0].pct).toBe(50);
  });
});

describe('getMonthComparison', () => {
  it('pctChange is null when the previous amount is 0', async () => {
    mockExpensesByRange
      .mockResolvedValueOnce([expense({ amount: 5000, categoryId: 1, date: '2026-06-05' })]) // current
      .mockResolvedValueOnce([]); // previous
    const cmp = await getMonthComparison('2026-06', '2026-05');
    const food = cmp.categories.find((c) => c.categoryId === 1);
    expect(food?.pctChange).toBeNull();
  });

  it('pctChange is correct for a known before/after pair', async () => {
    mockExpensesByRange
      .mockResolvedValueOnce([expense({ amount: 12000, categoryId: 1, date: '2026-06-05' })]) // current
      .mockResolvedValueOnce([expense({ amount: 10000, categoryId: 1, date: '2026-05-05' })]); // previous
    const cmp = await getMonthComparison('2026-06', '2026-05');
    const food = cmp.categories.find((c) => c.categoryId === 1);
    expect(food?.pctChange).toBeCloseTo(20, 5);
  });
});

describe('generateSuggestions', () => {
  it('returns a suggestion for a category with pctChange > 10', () => {
    const out = generateSuggestions({
      categories: [
        { categoryId: 1, categoryLabel: 'Food', current: 12000, previous: 10000, pctChange: 20 },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].categoryLabel).toBe('Food');
    expect(out[0].message).toContain('Food');
    expect(out[0].message).toContain('20%');
  });

  it('returns no suggestion when pctChange <= 10', () => {
    const out = generateSuggestions({
      categories: [
        { categoryId: 1, categoryLabel: 'Food', current: 10500, previous: 10000, pctChange: 5 },
      ],
    });
    expect(out).toHaveLength(0);
  });

  it('returns no suggestion when pctChange is null (previous was 0)', () => {
    const out = generateSuggestions({
      categories: [
        { categoryId: 1, categoryLabel: 'Food', current: 5000, previous: 0, pctChange: null },
      ],
    });
    expect(out).toHaveLength(0);
  });
});
