import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { MoneyViewCard } from '@/features/finance/budget/MoneyViewCard';

const COMMITTED = { recurring: 30_000, planned: 12_000, debts: 10_000, total: 52_000 };

describe('MoneyViewCard', () => {
  it('keeps budget left, cash and committed money apart', () => {
    render(<MoneyViewCard budgetLeft={120_000} money={{ cash: 90_000, committed: COMMITTED }} />);

    expect(screen.getByTestId('money-budget-left')).toHaveTextContent('120 000 FCFA');
    expect(screen.getByTestId('money-cash')).toHaveTextContent('90 000 FCFA');
    expect(screen.getByTestId('money-committed')).toHaveTextContent('52 000 FCFA');
  });

  it('says what the committed money is made of', () => {
    render(<MoneyViewCard budgetLeft={120_000} money={{ cash: 90_000, committed: COMMITTED }} />);

    expect(
      screen.getByText('Bills 30 000 FCFA · Planned 12 000 FCFA · Debts 10 000 FCFA'),
    ).toBeTruthy();
  });

  it('warns when more is due than the wallets hold', () => {
    render(<MoneyViewCard budgetLeft={120_000} money={{ cash: 40_000, committed: COMMITTED }} />);

    expect(screen.getByTestId('money-shortfall')).toHaveTextContent(
      'What is due by month end is 12 000 FCFA more than your cash.',
    );
  });

  it('stays calm when the cash covers what is due', () => {
    render(<MoneyViewCard budgetLeft={120_000} money={{ cash: 90_000, committed: COMMITTED }} />);

    expect(screen.queryByTestId('money-shortfall')).toBeNull();
  });
});
