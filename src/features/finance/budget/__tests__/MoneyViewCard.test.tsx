import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { MoneyViewCard } from '@/features/finance/budget/MoneyViewCard';
import type { MoneyView } from '@/features/finance/budget/budget.types';

const COMMITTED = { recurring: 30_000, planned: 12_000, debts: 10_000, tontines: 0, total: 52_000 };

function money(overrides: Partial<MoneyView> = {}): MoneyView {
  return { cash: 90_000, goalCash: 0, committed: COMMITTED, safeToSpend: 38_000, ...overrides };
}

describe('MoneyViewCard', () => {
  it('keeps budget left, cash and committed money apart', () => {
    render(<MoneyViewCard budgetLeft={120_000} money={money()} />);

    expect(screen.getByTestId('money-budget-left')).toHaveTextContent('120 000 FCFA');
    expect(screen.getByTestId('money-cash')).toHaveTextContent('90 000 FCFA');
    expect(screen.getByTestId('money-committed')).toHaveTextContent('52 000 FCFA');
  });

  it('says what the committed money is made of', () => {
    render(<MoneyViewCard budgetLeft={120_000} money={money()} />);

    expect(
      screen.getByText('Bills 30 000 FCFA · Planned 12 000 FCFA · Debts 10 000 FCFA'),
    ).toBeTruthy();
  });

  it('names tontine contributions due when there are some, and only the sources that are (VS-52)', () => {
    render(
      <MoneyViewCard
        budgetLeft={120_000}
        money={money({ committed: { recurring: 30_000, planned: 0, debts: 0, tontines: 20_000, total: 50_000 } })}
      />,
    );

    expect(screen.getByText('Bills 30 000 FCFA · Tontines 20 000 FCFA')).toBeTruthy();
  });

  it('shows what is safe to spend: cash outside the goals, less what is due (VS-49)', () => {
    render(<MoneyViewCard budgetLeft={120_000} money={money({ goalCash: 25_000, safeToSpend: 13_000 })} />);

    expect(screen.getByTestId('money-safe')).toHaveTextContent('13 000 FCFA');
    expect(screen.getByTestId('money-goal-cash')).toHaveTextContent('25 000 FCFA of it is in goal wallets');
  });

  it('says nothing about goal wallets when none hold money', () => {
    render(<MoneyViewCard budgetLeft={120_000} money={money()} />);

    expect(screen.queryByTestId('money-goal-cash')).toBeNull();
  });

  it('warns when more is due than the cash outside the goals', () => {
    render(<MoneyViewCard budgetLeft={120_000} money={money({ goalCash: 50_000, safeToSpend: -12_000 })} />);

    expect(screen.getByTestId('money-shortfall')).toHaveTextContent(
      'What is due by month end is 12 000 FCFA more than the cash outside your goals.',
    );
  });

  it('stays calm when the cash covers what is due', () => {
    render(<MoneyViewCard budgetLeft={120_000} money={money()} />);

    expect(screen.queryByTestId('money-shortfall')).toBeNull();
  });
});
