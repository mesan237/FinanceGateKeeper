import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { BudgetOverview as BudgetOverviewData } from '@/features/finance/budget/budget.types';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  // Resolved once at module load — calling `requireActual` inside the hook body
  // would re-resolve React on every single render, which is slow enough to time
  // the suite out under load.
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
    // Run the focus callback on mount, the way a focused screen behaves.
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

import { BudgetOverview } from '@/features/finance/budget/BudgetOverview';
import * as envelopes from '@/features/finance/budget/budget.envelopes';
import * as plan from '@/features/finance/budget/budget.plan';

const mockedGetOverview = plan.getBudgetOverview as jest.MockedFunction<
  typeof plan.getBudgetOverview
>;
const mockedSetBudget = envelopes.setCategoryBudget as jest.MockedFunction<
  typeof envelopes.setCategoryBudget
>;

const FOOD = 1;
const TRANSPORT = 5;

function envelope(overrides: Partial<BudgetOverviewData['categories'][number]> = {}) {
  return {
    categoryId: FOOD,
    categoryName: 'Food',
    allocated: 60_000,
    carriedIn: 0,
    available: 60_000,
    spent: 30_000,
    remaining: 30_000,
    consumedPct: 50,
    dailyAverage: 3_000,
    projected: 90_000,
    expectedToDate: 20_000,
    rolloverEnabled: false,
    health: 'at_risk' as const,
    ...overrides,
  };
}

function overviewData(overrides: Partial<BudgetOverviewData> = {}): BudgetOverviewData {
  return {
    month: '2026-08',
    plan: {
      month: '2026-08',
      totalBudget: 300_000,
      isExplicit: true,
      derivedTotal: 260_000,
      assigned: 300_000,
      unassigned: 0,
      isOverAllocated: false,
    },
    categories: [envelope()],
    totalCarried: 0,
    available: 300_000,
    spent: 100_000,
    remaining: 200_000,
    consumedPct: 33,
    dailyAverage: 10_000,
    projected: 310_000,
    expectedToDate: 100_000,
    safeDailySpend: 9_523,
    daysElapsed: 10,
    daysRemaining: 21,
    health: 'at_risk',
    isUnplanned: false,
    ...overrides,
  };
}

// The Budget tab is the app's largest composed screen — hero, envelope list,
// insights, and a sheet — so each render is genuinely expensive. The raised
// budget keeps the suite honest under a saturated full-suite run rather than
// masking a real hang.
jest.setTimeout(20_000);

/** Renders the tab and waits for its first load to settle. */
async function renderTab() {
  render(<BudgetOverview monthISO="2026-08" />);
  await waitFor(() => expect(screen.queryByTestId('budget-skeleton')).toBeNull(), {
    timeout: 5_000,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetOverview.mockResolvedValue(overviewData());
  mockedSetBudget.mockResolvedValue();
});

// This suite asserts on calendar labels and on "the current month", so it pins
// the clock rather than inheriting the wall clock — which is what silently
// turned it red once real time moved past the month the fixtures assume.
// Only `Date` is faked; every timer stays real so RNTL's `waitFor` is unaffected.
const DO_NOT_FAKE = [
  'hrtime',
  'nextTick',
  'performance',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;

beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-08-15T12:00:00.000Z'), doNotFake: [...DO_NOT_FAKE] });
});

afterAll(() => {
  jest.useRealTimers();
});

describe('BudgetOverview — loading and empty states', () => {
  it('shows a skeleton shaped like the loaded screen while data arrives', async () => {
    render(<BudgetOverview monthISO="2026-08" />);
    expect(screen.getByTestId('budget-skeleton')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('budget-skeleton')).toBeNull());
  });

  it('offers a call to action when the month has no plan yet', async () => {
    mockedGetOverview.mockResolvedValue(overviewData({ isUnplanned: true, categories: [] }));
    await renderTab();

    expect(screen.getByTestId('budget-empty')).toBeTruthy();
    expect(screen.getByText('No plan for August 2026 yet')).toBeTruthy();
  });

  it('routes to the planner from the empty state', async () => {
    mockedGetOverview.mockResolvedValue(overviewData({ isUnplanned: true, categories: [] }));
    await renderTab();

    fireEvent.press(screen.getByText('Plan this month'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/budget/plan',
      params: { month: '2026-08' },
    });
  });

  it('hides the hero entirely when the month is unplanned', async () => {
    mockedGetOverview.mockResolvedValue(overviewData({ isUnplanned: true, categories: [] }));
    await renderTab();

    expect(screen.queryByTestId('budget-hero')).toBeNull();
  });
});

describe('BudgetOverview — the hero', () => {
  it('leads with what is left to spend', async () => {
    await renderTab();
    expect(screen.getByTestId('budget-remaining')).toHaveTextContent('200 000 FCFA');
  });

  it('states the status as a word, not only a colour', async () => {
    await renderTab();
    expect(screen.getByTestId('budget-health-chip')).toHaveTextContent('Watch out');
  });

  it('reads as over budget when the remainder is negative', async () => {
    mockedGetOverview.mockResolvedValue(
      overviewData({ remaining: -15_000, spent: 315_000, health: 'over', consumedPct: 105 }),
    );
    await renderTab();

    expect(screen.getByText('Over budget by')).toBeTruthy();
    expect(screen.getByTestId('budget-health-chip')).toHaveTextContent('Over budget');
  });

  it('shows the pace marker so the bar answers ahead-or-behind', async () => {
    await renderTab();
    expect(screen.getByTestId('budget-meter-marker')).toBeTruthy();
  });

  it('surfaces days left, safe daily spend, and the projection', async () => {
    await renderTab();

    expect(screen.getByTestId('budget-stat-days')).toHaveTextContent('21Days left');
    expect(screen.getByTestId('budget-stat-daily')).toHaveTextContent(
      '9 523 FCFASafe daily spend',
    );
    expect(screen.getByTestId('budget-stat-projected')).toHaveTextContent(
      '310 000 FCFAOn this pace',
    );
  });

  it('mentions carried-over budget only when there is some', async () => {
    await renderTab();
    expect(screen.queryByTestId('budget-carried')).toBeNull();

    mockedGetOverview.mockResolvedValue(overviewData({ totalCarried: 12_000 }));
    await renderTab();

    expect(screen.getByTestId('budget-carried')).toHaveTextContent(
      'Includes 12 000 FCFA carried over from last month.',
    );
  });
});

describe('BudgetOverview — distribution', () => {
  it('says nothing about unassigned budget when it is fully distributed', async () => {
    await renderTab();
    expect(screen.queryByTestId('budget-unassigned-strip')).toBeNull();
  });

  it('prompts to assign what is left over', async () => {
    mockedGetOverview.mockResolvedValue(
      overviewData({
        plan: { ...overviewData().plan, assigned: 255_000, unassigned: 45_000 },
      }),
    );
    await renderTab();

    expect(screen.getByTestId('budget-unassigned-strip')).toBeTruthy();
    expect(screen.getByText('45 000 FCFA unassigned')).toBeTruthy();
  });

  it('warns when the envelopes promise more than the budget', async () => {
    mockedGetOverview.mockResolvedValue(
      overviewData({
        plan: {
          ...overviewData().plan,
          assigned: 330_000,
          unassigned: -30_000,
          isOverAllocated: true,
        },
      }),
    );
    await renderTab();

    expect(screen.getByText('30 000 FCFA over-allocated')).toBeTruthy();
  });

  it('routes to the planner from the unassigned strip', async () => {
    mockedGetOverview.mockResolvedValue(
      overviewData({ plan: { ...overviewData().plan, unassigned: 45_000 } }),
    );
    await renderTab();

    fireEvent.press(screen.getByTestId('budget-unassigned-strip'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/budget/plan',
      params: { month: '2026-08' },
    });
  });
});

describe('BudgetOverview — envelopes', () => {
  it('renders a row per category with its remaining amount', async () => {
    await renderTab();

    expect(screen.getByTestId(`envelope-row-${FOOD}`)).toBeTruthy();
    expect(screen.getByText('30 000 FCFA')).toBeTruthy();
  });

  it('shows each envelope its own pace marker and projection', async () => {
    await renderTab();

    expect(screen.getByTestId(`envelope-meter-${FOOD}-marker`)).toBeTruthy();
    expect(screen.getByTestId(`envelope-projected-${FOOD}`)).toHaveTextContent('ends ~90 000 FCFA');
  });

  it('marks a category that has spending but no budget', async () => {
    mockedGetOverview.mockResolvedValue(
      overviewData({
        categories: [
          envelope({
            categoryId: TRANSPORT,
            categoryName: 'Transport',
            allocated: 0,
            available: 0,
            spent: 9_000,
            remaining: -9_000,
            health: 'on_track',
          }),
        ],
      }),
    );
    await renderTab();

    expect(screen.getByText('No budget set')).toBeTruthy();
  });

  it('flags an envelope that rolls over', async () => {
    mockedGetOverview.mockResolvedValue(
      overviewData({ categories: [envelope({ rolloverEnabled: true })] }),
    );
    await renderTab();

    expect(screen.getByTestId(`envelope-rollover-${FOOD}`)).toBeTruthy();
  });

  it('opens the edit sheet when an envelope is tapped', async () => {
    await renderTab();

    fireEvent.press(screen.getByTestId(`envelope-row-${FOOD}`));

    await waitFor(() => expect(screen.getByTestId('envelope-sheet')).toBeTruthy());
  });

  it('saves an edited envelope and re-reads the month', async () => {
    await renderTab();
    fireEvent.press(screen.getByTestId(`envelope-row-${FOOD}`));
    await waitFor(() => expect(screen.getByTestId('envelope-amount')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('envelope-amount'), '75000');
    fireEvent.press(screen.getByTestId('envelope-save'));

    await waitFor(() =>
      expect(mockedSetBudget).toHaveBeenCalledWith('2026-08', FOOD, 75_000, false),
    );
    // Once for the initial focus load, again after the write.
    expect(mockedGetOverview.mock.calls.length).toBeGreaterThan(1);
  });

  it('prompts to cover an overspent envelope from another one', async () => {
    mockedGetOverview.mockResolvedValue(
      overviewData({
        categories: [
          envelope({ spent: 70_000, remaining: -10_000, health: 'over' }),
          envelope({
            categoryId: TRANSPORT,
            categoryName: 'Transport',
            allocated: 40_000,
            available: 40_000,
            spent: 10_000,
            remaining: 30_000,
            health: 'on_track',
          }),
        ],
      }),
    );
    await renderTab();

    fireEvent.press(screen.getByTestId(`envelope-row-${FOOD}`));
    await waitFor(() => expect(screen.getByTestId('envelope-cover')).toBeTruthy());

    fireEvent.press(screen.getByTestId('envelope-cover'));

    await waitFor(() => expect(screen.getByTestId('envelope-cover-picker')).toBeTruthy());
    expect(screen.getByTestId(`envelope-cover-${TRANSPORT}`)).toBeTruthy();
  });
});

describe('BudgetOverview — month navigation', () => {
  it('steps back to the previous month', async () => {
    await renderTab();

    fireEvent.press(screen.getByTestId('budget-month-prev'));

    await waitFor(() => expect(mockedGetOverview).toHaveBeenCalledWith('2026-07'));
  });

  it('does not step past the current month', async () => {
    await renderTab();

    fireEvent.press(screen.getByTestId('budget-month-next'));

    await waitFor(() => expect(mockedGetOverview).not.toHaveBeenCalledWith('2026-09'));
  });
});

