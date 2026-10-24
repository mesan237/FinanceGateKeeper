import { fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';

import { MoneyViewCard } from '@/features/finance/budget/MoneyViewCard';
import type { MoneyView } from '@/features/finance/budget/budget.types';
import i18n from '@/i18n';

const COMMITTED = { recurring: 30_000, planned: 12_000, debts: 10_000, tontines: 0, total: 52_000 };

function money(overrides: Partial<MoneyView> = {}): MoneyView {
  return { cash: 90_000, goalCash: 0, committed: COMMITTED, safeToSpend: 38_000, ...overrides };
}

/** Opens the free-cash breakdown and scopes queries to it. */
function openSheet() {
  fireEvent.press(screen.getByTestId('money-view'));
  return within(screen.getByTestId('money-sheet'));
}

describe('MoneyViewCard (UX-13)', () => {
  it('is one line: free cash, what it means, and its figure', () => {
    render(<MoneyViewCard money={money()} />);

    expect(screen.getByText('Free cash')).toBeTruthy();
    expect(screen.getByTestId('money-safe')).toHaveTextContent('38 000 FCFA');
    expect(screen.queryByTestId('money-cash')).toBeNull();
    expect(screen.queryByTestId('money-committed')).toBeNull();
  });

  it('leaves the plan figure to the hero instead of repeating it (UX-01)', () => {
    render(<MoneyViewCard money={money()} />);

    expect(screen.queryByTestId('money-budget-left')).toBeNull();
  });

  it('shows the subtraction behind free cash, so the arithmetic can be checked', () => {
    render(<MoneyViewCard money={money({ goalCash: 25_000, safeToSpend: 13_000 })} />);

    const sheet = openSheet();
    expect(sheet.getByTestId('money-cash')).toHaveTextContent('90 000 FCFA');
    expect(sheet.getByTestId('money-goal-cash')).toHaveTextContent('−25 000 FCFA');
    expect(sheet.getByTestId('money-committed')).toHaveTextContent('−52 000 FCFA');
    expect(sheet.getByTestId('money-total')).toHaveTextContent('13 000 FCFA');
  });

  it('says what the money due is made of, naming only the sources that have some (VS-52)', () => {
    render(
      <MoneyViewCard
        money={money({ committed: { recurring: 30_000, planned: 0, debts: 0, tontines: 20_000, total: 50_000 } })}
      />,
    );

    const sheet = openSheet();
    expect(sheet.getByText('Bills 30 000 FCFA · Tontines 20 000 FCFA')).toBeTruthy();
  });

  it('leaves goal wallets out of the sum when none hold money', () => {
    render(<MoneyViewCard money={money()} />);

    expect(openSheet().queryByTestId('money-goal-cash')).toBeNull();
  });

  it('warns on the line itself when more is due than the cash outside the goals', () => {
    render(<MoneyViewCard money={money({ goalCash: 50_000, safeToSpend: -12_000 })} />);

    expect(screen.getByTestId('money-shortfall')).toHaveTextContent(
      'What is due by month end is 12 000 FCFA more than the cash outside your goals.',
    );
  });

  it('stays calm when the cash covers what is due', () => {
    render(<MoneyViewCard money={money()} />);

    expect(screen.queryByTestId('money-shortfall')).toBeNull();
  });

  it('reads in French', async () => {
    await i18n.changeLanguage('fr');
    render(<MoneyViewCard money={money({ goalCash: 25_000, safeToSpend: 13_000 })} />);

    expect(screen.getByText('Argent libre')).toBeTruthy();
    expect(openSheet().getByText('Dans les portefeuilles des objectifs')).toBeTruthy();
  });
});
