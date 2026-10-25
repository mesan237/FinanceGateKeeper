import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { BudgetOverview as BudgetOverviewData, MonthlyPlan } from '@/features/finance/budget/budget.types';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
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
}));
jest.mock('@/features/finance/budget/budget.cashflow', () => ({
  addSurplusToBudget: jest.fn().mockResolvedValue(undefined),
  leaveSurplusUnbudgeted: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/features/finance/budget/budget.goals', () => ({
  getGoalCash: jest.fn().mockResolvedValue(25_000),
  getGoalSetAside: jest.fn().mockResolvedValue(0),
}));
jest.mock('@/features/finance/budget/budget.committed', () => ({
  getCommitted: jest.fn(),
}));
jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getCashOnHand: jest.fn(),
  getBalanceFreshness: jest.fn().mockResolvedValue({ checkedOn: '2026-10-15', daysSince: 2, unchecked: 0, stale: false }),
  getUnassignedSpending: jest.fn().mockResolvedValue({ count: 0, total: 0 }),
}));

import { getBalanceFreshness, getCashOnHand } from '@/features/finance/accounts/accounts.service';
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
  setAside: 0,
  spendable: 250_000,
  setAsideShortfall: 0,
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
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetOverview.mockResolvedValue(overviewData());
  mockedCash.mockResolvedValue(90_000);
  (getBalanceFreshness as jest.Mock).mockResolvedValue({ checkedOn: '2026-10-15', daysSince: 2, unchecked: 0, stale: false });
  mockedCommitted.mockResolvedValue({ recurring: 30_000, planned: 12_000, debts: 10_000, tontines: 0, total: 52_000 });
});

describe('BudgetOverview — cash flow (VS-47)', () => {
  it('says the plan rests on expected income while less has come in', async () => {
    mockedGetOverview.mockResolvedValue(overviewData({ receivedIncome: 200_000, surplusNeedsJob: false }));
    await renderTab();

    expect(screen.getByTestId('budget-expected-income')).toHaveTextContent(
      'Planned on expected income · 200 000 FCFA of 250 000 FCFA received',
    );
  });

  it('says how much the goals took before the budget, in "How this plan is built" (VS-49)', async () => {
    mockedGetOverview.mockResolvedValue(overviewData({ setAside: 30_000, spendable: 220_000 }));
    await renderTab();

    fireEvent.press(screen.getByTestId('budget-how-built'));
    expect(screen.getByTestId('plan-build-set-aside')).toHaveTextContent('−30 000 FCFA');
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

  it('offers one action at a time: the surplus first, then what is left to share out (UX-13)', async () => {
    mockedGetOverview.mockResolvedValue(overviewData({ unassigned: 45_000, assigned: 205_000 }));
    await renderTab();

    expect(screen.getByTestId('surplus-card')).toBeTruthy();
    expect(screen.queryByTestId('budget-unassigned-strip')).toBeNull();
  });

  it('shows the share-out strip once the surplus has an answer', async () => {
    mockedGetOverview.mockResolvedValue(overviewData({ surplusNeedsJob: false, unassigned: 45_000, assigned: 205_000 }));
    await renderTab();

    expect(screen.getByTestId('budget-unassigned-strip')).toBeTruthy();
  });

  it('stays quiet when the surplus already has an answer', async () => {
    mockedGetOverview.mockResolvedValue(overviewData({ surplusNeedsJob: false }));
    await renderTab();

    expect(screen.queryByTestId('surplus-card')).toBeNull();
  });

  it('shows cash and what is due for the current month, not the plan figure again', async () => {
    await renderTab();

    // 90 000 cash − 25 000 in goal wallets − 52 000 due (VS-49).
    await waitFor(() => expect(screen.getByTestId('money-safe')).toHaveTextContent('13 000 FCFA'));
    expect(screen.queryByTestId('money-budget-left')).toBeNull();
    fireEvent.press(screen.getByTestId('money-view'));
    expect(screen.getByTestId('money-cash')).toHaveTextContent('90 000 FCFA');
    expect(screen.getByTestId('money-committed')).toHaveTextContent('−52 000 FCFA');
    expect(mockedCommitted).toHaveBeenCalledWith('2026-10');
  });

  it('opens Accounts to check balances that are not fresh (UX-21)', async () => {
    // The tab reads the money view on mount and on focus, so every read is stale here.
    (getBalanceFreshness as jest.Mock).mockResolvedValue({ checkedOn: null, daysSince: null, unchecked: 2, stale: true });
    await renderTab();

    fireEvent.press(await screen.findByTestId('money-check-balances'));

    expect(mockPush).toHaveBeenCalledWith('/accounts');
  });

  it('leaves the cash view and the surplus prompt off a past month', async () => {
    mockedGetOverview.mockResolvedValue({ ...overviewData(), month: '2026-09' });
    await renderTab('2026-09');

    expect(screen.queryByTestId('money-view')).toBeNull();
    expect(screen.queryByTestId('surplus-card')).toBeNull();
    expect(mockedCash).not.toHaveBeenCalled();
  });
});
