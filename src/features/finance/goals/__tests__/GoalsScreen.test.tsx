import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React, { useEffect } from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn() }),
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock('@/features/finance/goals/goals.service', () => ({
  getGoals: jest.fn(),
}));

import { JourneyStageProvider, useSetJourneyStage } from '@/components/JourneyStageProvider';
import { GoalsScreen } from '@/features/finance/goals/GoalsScreen';
import * as service from '@/features/finance/goals/goals.service';
import type { GoalProgress, GoalWithProgress } from '@/features/finance/goals/goals.types';
import i18n from '@/i18n';
import type { JourneyStepKey } from '@/types/journey';

const mockedGetGoals = service.getGoals as jest.MockedFunction<typeof service.getGoals>;

const PROGRESS: GoalProgress = {
  saved: 75_000,
  remaining: 225_000,
  pct: 25,
  achieved: false,
  savedThisMonth: 10_000,
  monthsLeft: 11,
  requiredMonthly: 20_455,
  onPace: true,
  isOverdue: false,
  monthsToTarget: null,
};

function goal(overrides: Partial<GoalWithProgress> = {}, progress: Partial<GoalProgress> = {}): GoalWithProgress {
  return {
    id: 1,
    name: 'School fees',
    kind: 'sinking',
    targetAmount: 300_000,
    targetDate: '2027-09-01',
    accountId: 4,
    monthlyAmount: 25_000,
    targetMonths: null,
    createdAt: '2026-10-01T08:00:00Z',
    accountName: 'Savings MoMo',
    progress: { ...PROGRESS, ...progress },
    reserveBasis: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetGoals.mockResolvedValue([goal()]);
});

/** Publishes `stage` the way the journey slice does once it has read the path. */
function AtStep({ stage, children }: { stage: JourneyStepKey; children: React.ReactNode }) {
  const publish = useSetJourneyStage();
  useEffect(() => publish(stage), [publish, stage]);
  return <>{children}</>;
}

function renderAt(stage: JourneyStepKey) {
  render(
    <JourneyStageProvider>
      <AtStep stage={stage}>
        <GoalsScreen />
      </AtStep>
    </JourneyStageProvider>,
  );
}

describe('GoalsScreen — the journey step (UX-10)', () => {
  it('explains, before Grow, that goals come at the last step', async () => {
    mockedGetGoals.mockResolvedValue([]);
    renderAt('plan');

    expect(await screen.findByTestId('goals-preview')).toBeTruthy();
    expect(screen.getByText('Goals come at the last step')).toBeTruthy();
    expect(screen.queryByTestId('goals-empty')).toBeNull();
  });

  it('still lets the user start one: "Add a goal anyway" opens the form', async () => {
    mockedGetGoals.mockResolvedValue([]);
    renderAt('observe');

    fireEvent.press(await screen.findByTestId('goals-preview-action'));

    expect(mockPush).toHaveBeenCalledWith('/goals/create');
  });

  it('opens My path from the preview', async () => {
    mockedGetGoals.mockResolvedValue([]);
    renderAt('observe');

    fireEvent.press(await screen.findByTestId('goals-preview-secondary'));

    expect(mockPush).toHaveBeenCalledWith('/path');
  });

  it('invites the first goal plainly once on Grow', async () => {
    mockedGetGoals.mockResolvedValue([]);
    renderAt('grow');

    expect(await screen.findByTestId('goals-empty')).toBeTruthy();
    expect(screen.queryByTestId('goals-preview')).toBeNull();
  });

  it('never hides goals that exist, whatever the step', async () => {
    renderAt('observe');

    expect(await screen.findByText('75 000 FCFA of 300 000 FCFA')).toBeTruthy();
    expect(screen.queryByTestId('goals-preview')).toBeNull();
  });

  it('reads in French', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    mockedGetGoals.mockResolvedValue([]);
    renderAt('see');

    expect(await screen.findByText('Les objectifs viennent à la dernière étape')).toBeTruthy();
    expect(screen.getByText('Créer un objectif quand même')).toBeTruthy();
  });
});

describe('GoalsScreen', () => {
  it('invites the first goal when there is none', async () => {
    mockedGetGoals.mockResolvedValue([]);
    render(<GoalsScreen />);

    expect(await screen.findByText('No goals yet')).toBeTruthy();
    fireEvent.press(screen.getAllByText('New goal')[0]);
    expect(mockPush).toHaveBeenCalledWith('/goals/create');
  });

  it('shows what the wallet holds against the target', async () => {
    render(<GoalsScreen />);

    expect(await screen.findByText('75 000 FCFA of 300 000 FCFA')).toBeTruthy();
    expect(screen.getByText('Kept in Savings MoMo')).toBeTruthy();
    expect(screen.getByText('Sinking fund')).toBeTruthy();
  });

  it('says what a sinking fund needs each month and what was saved this month', async () => {
    render(<GoalsScreen />);

    expect(await screen.findByText(/needs 20 455 FCFA a month/)).toBeTruthy();
    expect(screen.getByText('This month: 10 000 FCFA saved of 25 000 FCFA')).toBeTruthy();
  });

  it('warns when the monthly amount will not arrive in time', async () => {
    mockedGetGoals.mockResolvedValue([goal({ monthlyAmount: 15_000 }, { onPace: false })]);
    render(<GoalsScreen />);

    expect(await screen.findByText('Your 15 000 FCFA a month will not get there in time.')).toBeTruthy();
  });

  it('estimates how long a buffer takes', async () => {
    mockedGetGoals.mockResolvedValue([
      goal(
        { kind: 'buffer', name: 'Buffer', targetDate: null, monthlyAmount: 15_000 },
        { monthsLeft: null, requiredMonthly: null, onPace: null, monthsToTarget: 4 },
      ),
    ]);
    render(<GoalsScreen />);

    expect(await screen.findByText('15 000 FCFA a month · about 4 months to go')).toBeTruthy();
  });

  it('says what an emergency reserve is sized from, provisional below three months (VS-50)', async () => {
    mockedGetGoals.mockResolvedValue([
      goal(
        {
          kind: 'reserve',
          name: 'Emergency reserve',
          targetDate: null,
          targetMonths: 3,
          targetAmount: 450_000,
          reserveBasis: { essentials: 150_000, source: 'observed', completeMonths: 1 },
        },
        { monthsLeft: null, requiredMonthly: null, onPace: null, monthsToTarget: 18 },
      ),
    ]);
    render(<GoalsScreen />);

    expect(await screen.findAllByText('Emergency reserve')).toHaveLength(2); // name and kind
    expect(screen.getByText('3 months of essentials at 150 000 FCFA a month · provisional')).toBeTruthy();
  });

  it('marks a goal that is reached', async () => {
    mockedGetGoals.mockResolvedValue([goal({}, { achieved: true, saved: 300_000, remaining: 0, pct: 100 })]);
    render(<GoalsScreen />);

    expect(await screen.findByText('Goal reached')).toBeTruthy();
  });

  it('reminds that a reached goal still takes its monthly amount from the budget (VS-49)', async () => {
    mockedGetGoals.mockResolvedValue([goal({}, { achieved: true, saved: 300_000, remaining: 0, pct: 100 })]);
    render(<GoalsScreen />);

    expect(
      await screen.findByText('Still takes 25 000 FCFA a month from your budget. Edit the goal to stop.'),
    ).toBeTruthy();
  });

  it('opens a transfer into the goal wallet from "Save now"', async () => {
    render(<GoalsScreen />);

    fireEvent.press(await screen.findByTestId('goal-save-1'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/transfers/log', params: { to: '4' } });
  });

  it('opens the goal for editing when tapped', async () => {
    render(<GoalsScreen />);

    fireEvent.press(await screen.findByTestId('goal-card-1'));

    expect(mockPush).toHaveBeenCalledWith('/goals/1');
  });

  it('speaks French', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    render(<GoalsScreen />);

    expect(await screen.findByText('75 000 FCFA sur 300 000 FCFA')).toBeTruthy();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });
});
