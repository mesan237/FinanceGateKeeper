import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React, { useEffect } from 'react';

import type { BudgetOverview as BudgetOverviewData, MonthlyPlan } from '@/features/finance/budget/budget.types';
import type { JourneyStepKey } from '@/types/journey';

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
jest.mock('@/features/finance/budget/budget.goals', () => ({
  getGoalCash: jest.fn().mockResolvedValue(0),
  getGoalSetAside: jest.fn().mockResolvedValue(0),
}));
jest.mock('@/features/finance/budget/budget.committed', () => ({
  getCommitted: jest.fn().mockResolvedValue({ recurring: 0, planned: 0, debts: 0, tontines: 0, total: 0 }),
}));
jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getCashOnHand: jest.fn().mockResolvedValue(0),
  getBalanceFreshness: jest.fn().mockResolvedValue({ checkedOn: '2026-10-15', daysSince: 2, unchecked: 0, stale: false }),
  getUnassignedSpending: jest.fn().mockResolvedValue({ count: 0, total: 0 }),
}));

import { JourneyStageProvider, useSetJourneyStage } from '@/components/JourneyStageProvider';
import { BudgetOverview } from '@/features/finance/budget/BudgetOverview';
import * as plan from '@/features/finance/budget/budget.plan';
import i18n from '@/i18n';

const mockedGetOverview = plan.getBudgetOverview as jest.MockedFunction<typeof plan.getBudgetOverview>;

// The Budget tab is the app's largest composed screen. Run alone this suite
// settles in well under a second, but in a full parallel run the JS thread is
// shared with every other suite and a mount can take several seconds; the old
// 5 s wait inside a 20 s test made it fail on most full runs. The limits below
// leave room for a saturated machine without hiding a real hang.
jest.setTimeout(40_000);

/** How long the tab may take to finish its first load under a full run. */
const LOAD_TIMEOUT = 15_000;

const PLAN: MonthlyPlan = {
  month: '2026-10',
  totalBudget: 0,
  isExplicit: false,
  derivedTotal: 0,
  derivedSource: 'received',
  expectedIncome: null,
  receivedIncome: 0,
  unbudgetedIncome: 0,
  surplusNeedsJob: false,
  setAside: 0,
  spendable: 0,
  setAsideShortfall: 0,
  assigned: 0,
  unassigned: 0,
  isOverAllocated: false,
};

function overviewData(overrides: Partial<BudgetOverviewData> = {}): BudgetOverviewData {
  return {
    month: '2026-10',
    plan: PLAN,
    categories: [],
    totalCarried: 0,
    available: 0,
    spent: 0,
    remaining: 0,
    consumedPct: 0,
    dailyAverage: 0,
    projected: 0,
    expectedToDate: 0,
    safeDailySpend: 0,
    daysElapsed: 17,
    daysRemaining: 14,
    health: 'on_track',
    isUnplanned: true,
    ...overrides,
  };
}

/** Publishes `stage` the way the journey slice does once it has read the path. */
function AtStep({ stage, children }: { stage: JourneyStepKey; children: React.ReactNode }) {
  const publish = useSetJourneyStage();
  useEffect(() => publish(stage), [publish, stage]);
  return <>{children}</>;
}

async function renderAt(stage: JourneyStepKey) {
  render(
    <JourneyStageProvider>
      <AtStep stage={stage}>
        <BudgetOverview monthISO="2026-10" />
      </AtStep>
    </JourneyStageProvider>,
  );
  // Settled means content on screen, not just the skeleton gone: the preview,
  // the empty month or the hero.
  await waitFor(
    () => {
      expect(screen.queryByTestId('budget-skeleton')).toBeNull();
      expect(
        screen.queryByTestId('budget-preview') ?? screen.queryByTestId('budget-empty') ?? screen.queryByTestId('budget-hero'),
      ).toBeTruthy();
    },
    { timeout: LOAD_TIMEOUT },
  );
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
});

describe('BudgetOverview — the journey step (UX-10)', () => {
  it('explains, while observing, that planning comes once the first months are in', async () => {
    await renderAt('observe');

    expect(screen.getByTestId('budget-preview')).toBeTruthy();
    expect(screen.getByText('Planning comes after your first months')).toBeTruthy();
    expect(screen.getByText(/Keep logging: planning is step 3 of your path\./)).toBeTruthy();
    expect(screen.queryByTestId('budget-empty')).toBeNull();
  });

  it('points to reading the first months on the See step', async () => {
    await renderAt('see');

    expect(screen.getByText(/Read what they cost on My path/)).toBeTruthy();
  });

  it('still lets the user plan now: "Plan anyway" opens the planner', async () => {
    await renderAt('observe');

    fireEvent.press(screen.getByTestId('budget-preview-action'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/budget/plan', params: { month: '2026-10' } });
  });

  it('opens My path from the preview', async () => {
    await renderAt('observe');

    fireEvent.press(screen.getByTestId('budget-preview-secondary'));

    expect(mockPush).toHaveBeenCalledWith('/path');
  });

  it('shows the plain empty month from the Plan step on', async () => {
    await renderAt('plan');

    expect(screen.getByTestId('budget-empty')).toBeTruthy();
    expect(screen.queryByTestId('budget-preview')).toBeNull();
  });

  it('never hides a plan that exists, whatever the step', async () => {
    mockedGetOverview.mockResolvedValue(
      overviewData({ isUnplanned: false, available: 100_000, remaining: 100_000, plan: { ...PLAN, totalBudget: 100_000, isExplicit: true, spendable: 100_000 } }),
    );
    await renderAt('observe');

    expect(screen.getByTestId('budget-hero')).toBeTruthy();
    expect(screen.queryByTestId('budget-preview')).toBeNull();
  });

  it('reads in French', async () => {
    await i18n.changeLanguage('fr');
    await renderAt('observe');

    expect(screen.getByText('Le budget vient après vos premiers mois')).toBeTruthy();
    expect(screen.getByText('Faire un budget quand même')).toBeTruthy();
    expect(screen.getByText('Voir mon parcours')).toBeTruthy();
  });
});
