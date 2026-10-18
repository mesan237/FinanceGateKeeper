import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn() }),
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock('@/features/finance/accounts/accounts.hooks', () => {
  const { ACCOUNTS } = jest.requireActual('@/features/finance/tontines/__fixtures__/tontines.fixtures');
  return {
    useAccounts: () => ({ accounts: ACCOUNTS, balances: {}, loading: false, error: null, refresh: jest.fn() }),
    useDefaultAccountId: () => 1,
  };
});

jest.mock('@/features/finance/tontines/tontines.service', () => ({
  getTontineDetail: jest.fn(),
  payContribution: jest.fn().mockResolvedValue(undefined),
  recordPayout: jest.fn().mockResolvedValue(undefined),
  removePayment: jest.fn().mockResolvedValue(undefined),
}));

import { detail } from '@/features/finance/tontines/__fixtures__/tontines.fixtures';
import { TontineDetail } from '@/features/finance/tontines/TontineDetail';
import * as service from '@/features/finance/tontines/tontines.service';

const mocked = service as jest.Mocked<typeof service>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getTontineDetail.mockResolvedValue(detail());
});

describe('TontineDetail', () => {
  it('lists every cycle with its status, and marks the payout turn', async () => {
    render(<TontineDetail tontineId={1} />);

    expect(await screen.findByTestId('cycle-1')).toHaveTextContent(/Paid/);
    expect(screen.getByTestId('cycle-2')).toHaveTextContent(/Overdue/);
    expect(screen.getByTestId('cycle-3')).toHaveTextContent(/Your turn/);
    expect(screen.getByTestId('cycle-4')).toHaveTextContent(/Upcoming/);
  });

  it('ticks a contribution paid from the chosen wallet', async () => {
    render(<TontineDetail tontineId={1} />);

    fireEvent.press(await screen.findByTestId('cycle-2-pay'));
    expect(await screen.findByText('Contribution for cycle 2')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tontine-sheet-wallet-trigger'));
    fireEvent.press(await screen.findByTestId('tontine-sheet-wallet-option-2'));
    const readsBefore = mocked.getTontineDetail.mock.calls.length;
    fireEvent.press(screen.getByTestId('tontine-sheet-save'));

    await waitFor(() => expect(mocked.payContribution).toHaveBeenCalledWith(1, 2, 2, expect.any(String)));
    await waitFor(() => expect(mocked.getTontineDetail.mock.calls.length).toBeGreaterThan(readsBefore));
  });

  it('un-ticks a paid contribution', async () => {
    render(<TontineDetail tontineId={1} />);

    fireEvent.press(await screen.findByTestId('cycle-1-undo'));

    await waitFor(() => expect(mocked.removePayment).toHaveBeenCalledWith(11));
  });

  it('records the payout, offering the full pot', async () => {
    render(<TontineDetail tontineId={1} />);

    fireEvent.press(await screen.findByTestId('tontine-record-payout'));
    expect(screen.getByTestId('tontine-sheet-amount').props.value).toBe('50 000');
    fireEvent.press(screen.getByTestId('tontine-sheet-save'));

    await waitFor(() => expect(mocked.recordPayout).toHaveBeenCalledWith(1, 50_000, 1, expect.any(String)));
  });

  it('shows the payout once received, with an undo', async () => {
    mocked.getTontineDetail.mockResolvedValue(
      detail({
        summary: {
          ...detail().summary,
          received: 50_000,
          payout: { id: 99, tontineId: 1, kind: 'payout', cycle: 3, amount: 50_000, accountId: 1, date: '2026-10-19' },
        },
      }),
    );
    render(<TontineDetail tontineId={1} />);

    expect(await screen.findByText(/^Payout received · 50 000 FCFA on /)).toBeTruthy();
    fireEvent.press(screen.getByTestId('tontine-undo-payout'));
    await waitFor(() => expect(mocked.removePayment).toHaveBeenCalledWith(99));
  });

  it('cannot record a payout before the turn is known', async () => {
    mocked.getTontineDetail.mockResolvedValue(detail({ payoutTurn: null }));
    render(<TontineDetail tontineId={1} />);

    await screen.findByTestId('cycle-1');
    expect(screen.queryByTestId('tontine-record-payout')).toBeNull();
  });

  it('opens the edit form', async () => {
    render(<TontineDetail tontineId={1} />);

    fireEvent.press(await screen.findByTestId('tontine-edit'));
    expect(mockPush).toHaveBeenCalledWith('/tontines/edit/1');
  });
});
