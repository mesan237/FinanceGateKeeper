import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { BudgetOverview as BudgetOverviewData, MonthlyPlan } from '@/features/finance/budget/budget.types';

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useFocusEffect: (cb: () => void) => {
      ReactModule.useEffect(() => cb(), [cb]);
    },
  };
});

jest.mock('@/features/finance/budget/budget.plan', () => ({
  getBudgetOverview: jest.fn(),
}));
jest.mock('@/features/finance/budget/budget.envelopes', () => ({
  setCategoryBudget: jest.fn(),
  removeCategoryBudget: jest.fn(),
  moveBudget: jest.fn(),
}));
jest.mock('@/features/finance/budget/budget.insights', () => ({
  getBudgetTrend: jest.fn().mockResolvedValue({ weekly: [], weeklyPace: 0, burndown: [] }),
  getMonthOverMonth: jest.fn().mockResolvedValue([]),
  rankByBudgetShare: jest.fn().mockReturnValue([]),
}));
jest.mock('@/features/finance/budget/budget.cashflow', () => ({
  addSurplusToBudget: jest.fn().mockResolvedValue(undefined),
  leaveSurplusUnbudgeted: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/features/finance/budget/budget.committed', () => ({
  getCommitted: jest.fn(),
}));
jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getCashOnHand: jest.fn(),
}));

import { getCashOnHand } from '@/features/finance/accounts/accounts.service';
import { BudgetOverview } from '@/features/finance/budget/BudgetOverview';
import * as cashflow from '@/features/finance/budget/budget.cashflow';
import { getCommitted } from '@/features/finance/budget/budget.committed';
import * as plan from '@/features/finance/budget/budget.plan';

const mockedGetOverview = plan.getBudgetOverview as jest.MockedFunction<typeof plan.getBudgetOverview>;
const mockedCash = getCashOnHand as jest.MockedFunction<typeof getCashOnHand>;
const mockedCommitted = getCommitted as jest.MockedFunction<typeof getCommitted>;

jest.setTimeout(20_000);

const PLAN: MonthlyPlan = {
  month: '2026-10',
  totalBudget: 250_000,
  isExplicit: false,
  derivedTotal: 250_000,
  derivedSource: 'expected',
  expectedIncome: 250_000,
  receivedIncome: 290_000,
  unbudgetedIncome: 40_000,
  surplusNeedsJob: true,
  assigned: 250_000,
  unassigned: 0,
  isOverAllocated: false,
};

function overviewData(planOverrides: Partial<MonthlyPlan> = {}): BudgetOverviewData {
  return {
    month: '2026-10',
    plan: { ...PLAN, ...planOverrides },
    categories: [],
    totalCarried: 0,
    available: 250_000,
    spent: 100_000,
    remaining: 150_000,
    consumedPct: 40,
    dailyAverage: 6_000,
    projected: 190_000,
    expectedToDate: 130_000,
    safeDailySpend: 10_000,
    daysElapsed: 17,
    daysRemaining: 15,
    health: 'on_track',
    isUnplanned: false,
  };
}

async function renderTab(monthISO = '2026-10') {
  render(<BudgetOverview monthISO={monthISO} />);
  await waitFor(() => expect(screen.getByTestId('budget-hero')).toBeTruthy());
}

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date('2026-10-17T12:00:00.000Z'),
    doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetOverview.mockResolvedValue(overviewData());
  mockedCash.mockResolvedValue(90_000);
  mockedCommitted.mockResolvedValue({ recurring: 30_000, planned: 12_000, debts: 10_000, total: 52_000 });
});

describe('BudgetOverview — cash flow (VS-47)', () => {
  it('says the plan rests on expected income and how much has come in', async () => {
    await renderTab();

    expect(screen.getByTestId('budget-expected-income')).toHaveTextContent(
      'Planned on expected income · 290 000 FCFA of 250 000 FCFA received',
    );
  });

  it('does not mention expected income once the user set the total', async () => {
    mockedGetOverview.mockResolvedValue(overviewData({ isExplicit: true }));
    await renderTab();

    expect(screen.queryByTestId('budget-expected-income')).toBeNull();
  });

  it('asks to give income above the budget a job', async () => {
    await renderTab();

    expect(screen.getByText('40 000 FCFA received above your budget')).toBeTruthy();
  });

  it('adds the surplus to the budget and re-reads the month', async () => {
    await renderTab();
    const readsBefore = mockedGetOverview.mock.calls.length;
    fireEvent.press(screen.getByTestId('surplus-add'));

    await waitFor(() => expect(cashflow.addSurplusToBudget).toHaveBeenCalledWith(overviewData().plan));
    await waitFor(() => expect(mockedGetOverview.mock.calls.length).toBeGreaterThan(readsBefore));
  });

  it('records a surplus left unassigned', async () => {
    await renderTab();
    fireEvent.press(screen.getByTestId('surplus-leave'));

    await waitFor(() => expect(cashflow.leaveSurplusUnbudgeted).toHaveBeenCalledWith('2026-10', 40_000));
  });

  it('stays quiet when the surplus already has an answer', async () => {
    mockedGetOverview.mockResolvedValue(overviewData({ surplusNeedsJob: false }));
    await renderTab();

    expect(screen.queryByTestId('surplus-card')).toBeNull();
  });

  it('shows budget left, cash and committed money for the current month', async () => {
    await renderTab();

    await waitFor(() => expect(screen.getByTestId('money-cash')).toHaveTextContent('90 000 FCFA'));
    expect(screen.getByTestId('money-budget-left')).toHaveTextContent('150 000 FCFA');
    expect(screen.getByTestId('money-committed')).toHaveTextContent('52 000 FCFA');
    expect(mockedCommitted).toHaveBeenCalledWith('2026-10');
  });

  it('leaves the cash view and the surplus prompt off a past month', async () => {
    mockedGetOverview.mockResolvedValue({ ...overviewData(), month: '2026-09' });
    await renderTab('2026-09');

    expect(screen.queryByTestId('money-view')).toBeNull();
    expect(screen.queryByTestId('surplus-card')).toBeNull();
    expect(mockedCash).not.toHaveBeenCalled();
  });
});
