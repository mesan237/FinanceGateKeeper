import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, push: jest.fn() }),
}));

jest.mock('@/features/finance/accounts/accounts.hooks', () => {
  const { ACCOUNTS } = jest.requireActual('@/features/finance/tontines/__fixtures__/tontines.fixtures');
  return {
    useAccounts: () => ({ accounts: ACCOUNTS, balances: {}, loading: false, error: null, refresh: jest.fn() }),
    useDefaultAccountId: () => 1,
  };
});

jest.mock('@/features/finance/tontines/tontines.service', () => ({
  createTontine: jest.fn().mockResolvedValue(7),
  updateTontine: jest.fn().mockResolvedValue(undefined),
  deleteTontine: jest.fn().mockResolvedValue(undefined),
  getTontineDetail: jest.fn(),
}));

import { detail } from '@/features/finance/tontines/__fixtures__/tontines.fixtures';
import { TontineForm } from '@/features/finance/tontines/TontineForm';
import * as service from '@/features/finance/tontines/tontines.service';

const mocked = service as jest.Mocked<typeof service>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getTontineDetail.mockResolvedValue(detail());
});

async function fill() {
  fireEvent.changeText(await screen.findByTestId('tontine-name'), 'Njangi');
  fireEvent.changeText(screen.getByTestId('tontine-contribution'), '10000');
  fireEvent.changeText(screen.getByTestId('tontine-members'), '5');
}

describe('TontineForm — new tontine', () => {
  it('keeps save disabled until a name, a contribution and the members are set', async () => {
    render(<TontineForm />);
    const save = await screen.findByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    await fill();

    expect(save).toBeEnabled();
  });

  it('creates a weekly tontine whose turn is not drawn yet, then opens it', async () => {
    render(<TontineForm />);
    await fill();
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mocked.createTontine).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Njangi',
          contributionAmount: 10_000,
          frequency: 'weekly',
          members: 5,
          payoutTurn: null,
          accountId: 1,
        }),
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith('/tontines/7');
  });

  it('saves a monthly tontine with a known turn', async () => {
    render(<TontineForm />);
    await fill();
    fireEvent.press(screen.getByTestId('tontine-frequency-monthly'));
    fireEvent.changeText(screen.getByTestId('tontine-turn'), '4');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mocked.createTontine).toHaveBeenCalledWith(
        expect.objectContaining({ frequency: 'monthly', payoutTurn: 4 }),
      ),
    );
  });

  it('shows why a save was refused', async () => {
    mocked.createTontine.mockRejectedValue(new Error('Your turn must be between 1 and the number of members.'));
    render(<TontineForm />);
    await fill();
    fireEvent.changeText(screen.getByTestId('tontine-turn'), '9');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Your turn must be between 1 and the number of members.')).toBeTruthy();
  });
});

describe('TontineForm — editing', () => {
  it('opens pre-filled and sets the turn after the draw', async () => {
    mocked.getTontineDetail.mockResolvedValue(detail({ payoutTurn: null }));
    render(<TontineForm tontineId={1} />);
    await waitFor(() => expect(screen.getByTestId('tontine-name').props.value).toBe('Njangi'));

    fireEvent.changeText(screen.getByTestId('tontine-turn'), '2');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mocked.updateTontine).toHaveBeenCalledWith(1, expect.objectContaining({ payoutTurn: 2 })));
    expect(mockBack).toHaveBeenCalled();
  });

  it('deletes the tontine after confirmation', async () => {
    render(<TontineForm tontineId={1} />);
    fireEvent.press(await screen.findByTestId('tontine-delete'));
    fireEvent.press(await screen.findByTestId('tontine-delete-confirm'));

    await waitFor(() => expect(mocked.deleteTontine).toHaveBeenCalledWith(1));
    expect(mockReplace).toHaveBeenCalledWith('/tontines');
  });
});
