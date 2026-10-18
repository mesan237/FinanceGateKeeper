import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: jest.fn(), push: mockPush }),
}));

// Cash is the default; "Savings MoMo" already holds 60 000.
jest.mock('@/features/finance/accounts/accounts.hooks', () => ({
  useAccounts: () => ({
    accounts: [
      { id: 1, name: 'Cash', type: 'cash', purpose: 'spending', openingBalance: 0, isDefault: true, isActive: true, createdAt: '' },
      { id: 4, name: 'Savings MoMo', type: 'mobile_money', purpose: 'saving', openingBalance: 0, isDefault: false, isActive: true, createdAt: '' },
    ],
    balances: { 1: 20_000, 4: 60_000 },
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock('@/features/finance/goals/goals.service', () => ({
  createGoal: jest.fn().mockResolvedValue(1),
  updateGoal: jest.fn().mockResolvedValue(undefined),
  deleteGoal: jest.fn().mockResolvedValue(undefined),
  getGoalById: jest.fn(),
  getGoals: jest.fn(),
  getEssentialsEstimate: jest.fn(),
  getEssentialMonthly: jest.fn(),
}));

import { GoalForm } from '@/features/finance/goals/GoalForm';
import * as service from '@/features/finance/goals/goals.service';

const mocked = service as jest.Mocked<typeof service>;

beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-10-17T12:00:00.000Z'), doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getEssentialsEstimate.mockResolvedValue(120_000);
  mocked.getEssentialMonthly.mockResolvedValue({ amount: 120_000, source: 'estimate', completeMonths: 0 });
  mocked.getGoalById.mockResolvedValue(null);
});

async function pickWallet(id: number) {
  fireEvent.press(await screen.findByTestId('goal-wallet-trigger'));
  fireEvent.press(await screen.findByTestId(`goal-wallet-option-${id}`));
}

describe('GoalForm — new goal', () => {
  it('keeps save disabled until a name, a target and a wallet are set', async () => {
    render(<GoalForm />);
    const save = await screen.findByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    fireEvent.changeText(screen.getByTestId('goal-name'), 'Buffer');
    fireEvent.changeText(screen.getByTestId('goal-target'), '100000');
    await pickWallet(4);

    expect(save).toBeEnabled();
  });

  it('creates a starter buffer with no date and returns', async () => {
    render(<GoalForm />);
    fireEvent.changeText(await screen.findByTestId('goal-name'), 'Buffer');
    fireEvent.changeText(screen.getByTestId('goal-target'), '100000');
    fireEvent.changeText(screen.getByTestId('goal-monthly'), '15000');
    await pickWallet(4);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mocked.createGoal).toHaveBeenCalledWith({
        name: 'Buffer',
        kind: 'buffer',
        targetAmount: 100_000,
        targetDate: null,
        targetMonths: null,
        accountId: 4,
        monthlyAmount: 15_000,
      }),
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it('offers one month of essentials as a buffer target', async () => {
    render(<GoalForm />);

    fireEvent.press(await screen.findByText('One month of essentials · 120 000 FCFA'));

    expect(screen.getByTestId('goal-target').props.value).toBe('120 000');
  });

  it('asks a sinking fund for its date and suggests what it needs each month', async () => {
    render(<GoalForm />);
    fireEvent.press(await screen.findByTestId('goal-kind-sinking'));
    fireEvent.changeText(screen.getByTestId('goal-name'), 'School fees');
    fireEvent.changeText(screen.getByTestId('goal-target'), '300000');
    await pickWallet(4);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.press(screen.getByTestId('goal-date'));
    fireEvent(screen.getByTestId('date-picker'), 'onChange', { type: 'set' }, new Date(2027, 8, 1));

    // 240 000 still missing over 11 months, rounded up.
    fireEvent.press(await screen.findByText('Needed: 21 819 FCFA a month'));
    expect(screen.getByTestId('goal-monthly').props.value).toBe('21 819');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('shows why a save was refused', async () => {
    mocked.createGoal.mockRejectedValue(new Error('That wallet already holds another goal. Pick a wallet of its own.'));
    render(<GoalForm />);
    fireEvent.changeText(await screen.findByTestId('goal-name'), 'Buffer');
    fireEvent.changeText(screen.getByTestId('goal-target'), '100000');
    await pickWallet(4);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('That wallet already holds another goal. Pick a wallet of its own.')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('GoalForm — emergency reserve (VS-50)', () => {
  it('sizes the reserve from months of essentials and saves the months', async () => {
    render(<GoalForm />);
    fireEvent.press(await screen.findByTestId('goal-kind-reserve'));
    fireEvent.changeText(screen.getByTestId('goal-name'), 'Emergency reserve');
    fireEvent.press(screen.getByTestId('goal-months-4'));
    await pickWallet(4);

    expect(screen.queryByTestId('goal-target')).toBeNull();
    expect(screen.getByTestId('goal-reserve-size')).toHaveTextContent('480 000 FCFA · 4 × 120 000 FCFA of essentials');
    expect(screen.getByText('From your essentials estimate. Provisional until 3 months are logged.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(mocked.createGoal).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'reserve', targetMonths: 4, targetDate: null, accountId: 4 }),
      ),
    );
  });

  it('says how to size a reserve when essentials are unknown, and cannot save', async () => {
    mocked.getEssentialMonthly.mockResolvedValue({ amount: null, source: null, completeMonths: 0 });
    render(<GoalForm />);
    fireEvent.press(await screen.findByTestId('goal-kind-reserve'));
    fireEvent.changeText(screen.getByTestId('goal-name'), 'Emergency reserve');
    await pickWallet(4);

    expect(await screen.findByTestId('goal-reserve-missing')).toBeTruthy();
    fireEvent.press(screen.getByTestId('goal-open-estimates'));
    expect(mockPush).toHaveBeenCalledWith('/budget/estimates');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});

describe('GoalForm — editing', () => {
  beforeEach(() => {
    mocked.getGoalById.mockResolvedValue({
      id: 3,
      name: 'School fees',
      kind: 'sinking',
      targetAmount: 300_000,
      targetDate: '2027-09-01',
      accountId: 4,
      monthlyAmount: 25_000,
      targetMonths: null,
      createdAt: '2026-10-01T08:00:00Z',
    });
  });

  it('opens pre-filled and saves the change', async () => {
    render(<GoalForm goalId={3} />);
    await waitFor(() => expect(screen.getByTestId('goal-name').props.value).toBe('School fees'));
    fireEvent.changeText(screen.getByTestId('goal-monthly'), '30000');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mocked.updateGoal).toHaveBeenCalledWith(3, expect.objectContaining({ monthlyAmount: 30_000, accountId: 4 })),
    );
  });

  it('deletes the goal after confirmation', async () => {
    render(<GoalForm goalId={3} />);
    fireEvent.press(await screen.findByTestId('goal-delete'));
    fireEvent.press(await screen.findByTestId('goal-delete-confirm'));

    await waitFor(() => expect(mocked.deleteGoal).toHaveBeenCalledWith(3));
    expect(mockBack).toHaveBeenCalled();
  });

  it('offers no delete on a new goal', async () => {
    render(<GoalForm />);
    await screen.findByTestId('goal-name');

    expect(screen.queryByTestId('goal-delete')).toBeNull();
  });
});
