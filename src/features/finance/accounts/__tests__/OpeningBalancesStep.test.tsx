import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getAccounts: jest.fn(),
  getAccountBalance: jest.fn(),
}));

jest.mock('@/features/finance/accounts/accounts.checks', () => ({
  confirmBalance: jest.fn().mockResolvedValue(undefined),
}));

import { OpeningBalancesStep } from '@/features/finance/accounts/OpeningBalancesStep';
import * as checks from '@/features/finance/accounts/accounts.checks';
import * as service from '@/features/finance/accounts/accounts.service';
import type { Account } from '@/features/finance/accounts/accounts.types';
import i18n from '@/i18n';

const mocked = service as jest.Mocked<typeof service>;
const mockedChecks = checks as jest.Mocked<typeof checks>;

const CASH: Account = {
  id: 1,
  name: 'Cash',
  type: 'cash',
  purpose: 'spending',
  openingBalance: 0,
  isDefault: true,
  isActive: true,
  createdAt: '2026-06-01T00:00:00Z',
};
const MTN: Account = { ...CASH, id: 2, name: 'MTN MoMo', type: 'mobile_money', isDefault: false };

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAccounts.mockResolvedValue([CASH, MTN]);
  mocked.getAccountBalance.mockResolvedValue(0);
});

describe('OpeningBalancesStep (UX-08)', () => {
  it('asks what each wallet holds today', async () => {
    render(<OpeningBalancesStep onDone={jest.fn()} />);

    expect(await screen.findByText('Cash')).toBeTruthy();
    expect(screen.getByText('MTN MoMo')).toBeTruthy();
    expect(screen.getByLabelText('What MTN MoMo holds today, in FCFA')).toBeTruthy();
  });

  it('records a balance check for each wallet filled in, and only those', async () => {
    const onDone = jest.fn();
    render(<OpeningBalancesStep onDone={onDone} />);

    fireEvent.changeText(await screen.findByTestId('opening-balance-1'), '12 500');
    fireEvent.press(screen.getByTestId('opening-balances-save'));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(mockedChecks.confirmBalance).toHaveBeenCalledTimes(1);
    expect(mockedChecks.confirmBalance).toHaveBeenCalledWith(1, 12_500);
  });

  it('moves on without writing anything when nothing is filled in', async () => {
    const onDone = jest.fn();
    render(<OpeningBalancesStep onDone={onDone} />);

    fireEvent.press(await screen.findByTestId('opening-balances-save'));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(mockedChecks.confirmBalance).not.toHaveBeenCalled();
  });

  it('lets the wallets wait: "Not now" moves on without saving what was typed (VS-87)', async () => {
    const onDone = jest.fn();
    render(<OpeningBalancesStep onDone={onDone} />);

    fireEvent.changeText(await screen.findByTestId('opening-balance-1'), '12 500');
    fireEvent.press(screen.getByTestId('opening-balances-later'));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(mockedChecks.confirmBalance).not.toHaveBeenCalled();
  });

  it('says a blank field is fine when the amount is unknown', async () => {
    render(<OpeningBalancesStep onDone={jest.fn()} />);
    expect((await screen.findByTestId('opening-balance-1')).props.placeholder).toBe("Blank if you don't know");
  });

  it('refuses an amount that is not whole FCFA and stays on the step', async () => {
    const onDone = jest.fn();
    render(<OpeningBalancesStep onDone={onDone} />);

    fireEvent.changeText(await screen.findByTestId('opening-balance-2'), '12,5');
    fireEvent.press(screen.getByTestId('opening-balances-save'));

    expect(await screen.findByTestId('opening-balances-error')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    expect(mockedChecks.confirmBalance).not.toHaveBeenCalled();
  });

  it('reads in French', async () => {
    await act(() => i18n.changeLanguage('fr'));
    try {
      render(<OpeningBalancesStep onDone={jest.fn()} />);
      expect(await screen.findByLabelText('Ce que contient Cash aujourd’hui, en FCFA')).toBeTruthy();
    } finally {
      await act(() => i18n.changeLanguage('en'));
    }
  });
});
