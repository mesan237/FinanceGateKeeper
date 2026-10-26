import { fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';

import { MoneyViewCard } from '@/features/finance/budget/MoneyViewCard';
import type { MoneyView } from '@/features/finance/budget/budget.types';
import i18n from '@/i18n';

const COMMITTED = { recurring: 30_000, planned: 12_000, debts: 10_000, tontines: 0, total: 52_000 };

const FRESH = { checkedOn: '2026-10-22', daysSince: 3, unchecked: 0, stale: false };
const NONE_UNASSIGNED = { count: 0, total: 0 };

function money(overrides: Partial<MoneyView> = {}): MoneyView {
  return {
    cash: 90_000,
    goalCash: 0,
    committed: COMMITTED,
    safeToSpend: 38_000,
    freshness: FRESH,
    unassigned: NONE_UNASSIGNED,
    ...overrides,
  };
}

function renderCard(m: MoneyView, onCheckBalances = jest.fn()) {
  render(<MoneyViewCard money={m} onCheckBalances={onCheckBalances} />);
  return onCheckBalances;
}

/** Opens the free-cash breakdown and scopes queries to it. */
function openSheet() {
  fireEvent.press(screen.getByTestId('money-view'));
  return within(screen.getByTestId('money-sheet'));
}

describe('MoneyViewCard (UX-13)', () => {
  it('is one line: free cash, what it means, and its figure', () => {
    renderCard(money());

    expect(screen.getByText('Free cash')).toBeTruthy();
    expect(screen.getByTestId('money-safe')).toHaveTextContent('38 000 FCFA');
    expect(screen.queryByTestId('money-cash')).toBeNull();
    expect(screen.queryByTestId('money-committed')).toBeNull();
  });

  it('leaves the plan figure to the hero instead of repeating it (UX-01)', () => {
    renderCard(money());

    expect(screen.queryByTestId('money-budget-left')).toBeNull();
  });

  it('shows the subtraction behind free cash, so the arithmetic can be checked', () => {
    renderCard(money({ goalCash: 25_000, safeToSpend: 13_000 }));

    const sheet = openSheet();
    expect(sheet.getByTestId('money-cash')).toHaveTextContent('90 000 FCFA');
    expect(sheet.getByTestId('money-goal-cash')).toHaveTextContent('−25 000 FCFA');
    expect(sheet.getByTestId('money-committed')).toHaveTextContent('−52 000 FCFA');
    expect(sheet.getByTestId('money-total')).toHaveTextContent('13 000 FCFA');
  });

  it('says what the money due is made of, naming only the sources that have some (VS-52)', () => {
    renderCard(money({ committed: { recurring: 30_000, planned: 0, debts: 0, tontines: 20_000, total: 50_000 } }));

    const sheet = openSheet();
    expect(sheet.getByText('Bills 30 000 FCFA · Tontines 20 000 FCFA')).toBeTruthy();
  });

  it('leaves goal wallets out of the sum when none hold money', () => {
    renderCard(money());

    expect(openSheet().queryByTestId('money-goal-cash')).toBeNull();
  });

  it('warns on the line itself when more is due than the cash outside the goals', () => {
    renderCard(money({ goalCash: 50_000, safeToSpend: -12_000 }));

    expect(screen.getByTestId('money-shortfall')).toHaveTextContent(
      'What is due by month end is 12 000 FCFA more than the cash outside your goals.',
    );
  });

  it('stays calm when the cash covers what is due', () => {
    renderCard(money());

    expect(screen.queryByTestId('money-shortfall')).toBeNull();
  });

  describe('readiness: no confident figure on balances that cannot be trusted (device build)', () => {
    const NEVER = { checkedOn: null, daysSince: null, unchecked: 2, stale: true };

    it('holds back the figure and the shortfall until the balances are confirmed', () => {
      renderCard(money({ safeToSpend: -186_775, freshness: NEVER }));

      expect(screen.getByTestId('money-not-ready')).toHaveTextContent('Not reliable yet');
      expect(screen.queryByTestId('money-safe')).toBeNull();
      expect(screen.queryByTestId('money-shortfall')).toBeNull();
      expect(screen.getByTestId('money-freshness')).toHaveTextContent('Some wallet balances were never confirmed');
      expect(screen.getByTestId('money-check-balances')).toBeTruthy();
    });

    it('opens no subtraction while the figure is not shown', () => {
      renderCard(money({ freshness: NEVER }));

      fireEvent.press(screen.getByTestId('money-view'));

      expect(screen.queryByTestId('money-sheet')).toBeNull();
    });

    it('treats spending outside every wallet as not ready too', () => {
      renderCard(money({ unassigned: { count: 48, total: 120_000 } }));

      expect(screen.getByTestId('money-not-ready')).toBeTruthy();
      expect(screen.queryByTestId('money-safe')).toBeNull();
    });

    it('shows the figure, the subtraction and the shortfall once it can be trusted', () => {
      renderCard(money({ goalCash: 50_000, safeToSpend: -12_000 }));

      expect(screen.queryByTestId('money-not-ready')).toBeNull();
      expect(screen.getByTestId('money-safe')).toHaveTextContent('-12 000 FCFA');
      expect(screen.getByTestId('money-shortfall')).toBeTruthy();
    });

    it('reads in French', async () => {
      await i18n.changeLanguage('fr');
      renderCard(money({ freshness: NEVER }));

      expect(screen.getByTestId('money-not-ready')).toHaveTextContent('Pas encore fiable');
    });
  });

  describe('how fresh the wallet balances are (UX-21)', () => {
    it('says when the balances were last checked', () => {
      renderCard(money());

      expect(screen.getByTestId('money-freshness')).toHaveTextContent('Balances checked 3 days ago');
      expect(screen.queryByTestId('money-check-balances')).toBeNull();
    });

    it('says "today" and "1 day ago" plainly', () => {
      renderCard(money({ freshness: { ...FRESH, daysSince: 0 } }));
      expect(screen.getByTestId('money-freshness')).toHaveTextContent('Balances checked today');
    });

    it('flags balances not confirmed for over 30 days, with a way to check them', () => {
      const onCheck = renderCard(
        money({ freshness: { checkedOn: '2026-09-20', daysSince: 35, unchecked: 0, stale: true } }),
      );

      expect(screen.getByTestId('money-freshness')).toHaveTextContent('Balances not confirmed since 20 Sep');
      fireEvent.press(screen.getByTestId('money-check-balances'));
      expect(onCheck).toHaveBeenCalledTimes(1);
    });

    it('flags a wallet never confirmed', () => {
      renderCard(money({ freshness: { checkedOn: null, daysSince: null, unchecked: 1, stale: true } }));

      expect(screen.getByTestId('money-freshness')).toHaveTextContent('Some wallet balances were never confirmed');
      expect(screen.getByTestId('money-check-balances')).toBeTruthy();
    });

    it('warns that spending outside any wallet makes free cash uncertain', () => {
      renderCard(money({ unassigned: { count: 2, total: 7_000 } }));

      expect(screen.getByTestId('money-unassigned')).toHaveTextContent(
        "2 expenses aren't in any wallet, so free cash may be off.",
      );
      expect(screen.getByTestId('money-check-balances')).toBeTruthy();
    });

    it('says nothing about it when every expense is in a wallet', () => {
      renderCard(money());
      expect(screen.queryByTestId('money-unassigned')).toBeNull();
    });

    it('reads in French', async () => {
      await i18n.changeLanguage('fr');
      renderCard(money({ freshness: { checkedOn: '2026-09-20', daysSince: 35, unchecked: 0, stale: true } }));

      expect(screen.getByTestId('money-freshness')).toHaveTextContent('Soldes non confirmés depuis le 20 sept.');
      expect(screen.getByText('Vérifier les soldes')).toBeTruthy();
    });
  });

  it('reads in French', async () => {
    await i18n.changeLanguage('fr');
    renderCard(money({ goalCash: 25_000, safeToSpend: 13_000 }));

    expect(screen.getByText('Argent libre')).toBeTruthy();
    expect(openSheet().getByText('Dans les portefeuilles des objectifs')).toBeTruthy();
  });
});
