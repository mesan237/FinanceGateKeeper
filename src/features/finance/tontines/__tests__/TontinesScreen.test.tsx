import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn() }),
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock('@/features/finance/tontines/tontines.service', () => ({
  getTontines: jest.fn(),
}));

import { tontine } from '@/features/finance/tontines/__fixtures__/tontines.fixtures';
import { TontinesScreen } from '@/features/finance/tontines/TontinesScreen';
import * as service from '@/features/finance/tontines/tontines.service';
import i18n from '@/i18n';

const mockedGetTontines = service.getTontines as jest.MockedFunction<typeof service.getTontines>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetTontines.mockResolvedValue([tontine()]);
});

describe('TontinesScreen', () => {
  it('invites the first tontine when there is none', async () => {
    mockedGetTontines.mockResolvedValue([]);
    render(<TontinesScreen />);

    expect(await screen.findByText('No tontines yet')).toBeTruthy();
    fireEvent.press(screen.getAllByText('New tontine')[0]);
    expect(mockPush).toHaveBeenCalledWith('/tontines/create');
  });

  it('shows the contribution, the cycle and the members', async () => {
    render(<TontinesScreen />);

    expect(await screen.findByText('10 000 FCFA every week · 5 members')).toBeTruthy();
    expect(screen.getByText('1 of 5 contributions paid')).toBeTruthy();
  });

  it('shows the turn, the pot and when it comes', async () => {
    render(<TontinesScreen />);

    expect(await screen.findByText(/^Your turn: 3 of 5 · 50 000 FCFA on /)).toBeTruthy();
  });

  it('says when the turn is not drawn yet', async () => {
    mockedGetTontines.mockResolvedValue([tontine({ payoutTurn: null }, { payoutDate: null })]);
    render(<TontinesScreen />);

    expect(await screen.findByText('Your turn is not drawn yet')).toBeTruthy();
  });

  it('flags overdue contributions', async () => {
    render(<TontinesScreen />);

    expect(await screen.findByText('1 contribution overdue')).toBeTruthy();
  });

  it('says the user is ahead before the payout', async () => {
    render(<TontinesScreen />);

    expect(await screen.findByText('You have paid in 10 000 FCFA more than you received.')).toBeTruthy();
  });

  it('says the user is behind after the payout', async () => {
    mockedGetTontines.mockResolvedValue([tontine({}, { position: -30_000, received: 50_000 })]);
    render(<TontinesScreen />);

    expect(
      await screen.findByText('You have received 30 000 FCFA more than you paid in. It is still owed in contributions.'),
    ).toBeTruthy();
  });

  it('opens a tontine when tapped', async () => {
    render(<TontinesScreen />);

    fireEvent.press(await screen.findByTestId('tontine-card-1'));
    expect(mockPush).toHaveBeenCalledWith('/tontines/1');
  });

  it('speaks French', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    render(<TontinesScreen />);

    expect(await screen.findByText('10 000 FCFA chaque semaine · 5 membres')).toBeTruthy();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });
});
