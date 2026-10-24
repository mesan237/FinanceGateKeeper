import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { DANGER, DANGER_LIGHT, SUCCESS_LIGHT, WARNING_LIGHT } from '@/constants/colors';
import { MonthOverviewCard } from '@/features/finance/dashboard/MonthOverviewCard';
import i18n from '@/i18n';
import type { BudgetSummary, Cashflow, DayLogging } from '@/features/finance/dashboard/dashboard.types';

const FUNDED: BudgetSummary = {
  expenseBudget: 65000,
  expensesLogged: 20000,
  expensesRemaining: 45000,
  spentPct: 31,
  pace: 'green',
  isPlanned: true,
};
const NEARLY_SPENT: BudgetSummary = {
  expenseBudget: 65000,
  expensesLogged: 55000,
  expensesRemaining: 10000,
  spentPct: 85,
  pace: 'yellow',
  isPlanned: true,
};
const OVERSPENT: BudgetSummary = {
  expenseBudget: 65000,
  expensesLogged: 70000,
  expensesRemaining: -5000,
  spentPct: 100,
  pace: 'red',
  isPlanned: true,
};
/**
 * A month with no plan: income received sizes a budget behind the scenes, but
 * the user never planned it, so the Budget tab shows its empty state (UX-04).
 */
const UNPLANNED: BudgetSummary = {
  expenseBudget: 100000,
  expensesLogged: 20000,
  expensesRemaining: 80000,
  spentPct: 20,
  pace: 'green',
  isPlanned: false,
};

const CASHFLOW: Cashflow = { income: 100000, expenses: 20000 };
const LOGGING: DayLogging = { loggedDays: 18, daysSoFar: 23 };

function renderCard(overrides: Partial<React.ComponentProps<typeof MonthOverviewCard>> = {}) {
  const onSetBudget = jest.fn();
  render(
    <MonthOverviewCard
      monthISO="2026-09"
      daysRemaining={6}
      summary={FUNDED}
      cashflow={CASHFLOW}
      logging={LOGGING}
      onSetBudget={onSetBudget}
      {...overrides}
    />,
  );
  return { onSetBudget };
}

describe('MonthOverviewCard', () => {
  describe('month header', () => {
    it('names the month in caps, without the year', () => {
      renderCard();
      expect(screen.getByText('SEPTEMBER')).toBeTruthy();
    });

    it('counts the days left in the month', () => {
      renderCard({ daysRemaining: 6 });
      expect(screen.getByText('6 days left')).toBeTruthy();
    });

    it('says "1 day left" rather than "1 days left"', () => {
      renderCard({ daysRemaining: 1 });
      expect(screen.getByText('1 day left')).toBeTruthy();
    });

    it('says "Last day" on the final day of the month', () => {
      renderCard({ daysRemaining: 0 });
      expect(screen.getByText('Last day')).toBeTruthy();
    });
  });

  describe('with a budget set', () => {
    it('leads with what is left in the plan', () => {
      renderCard();
      expect(screen.getByText('Left in your plan')).toBeTruthy();
      expect(screen.getByText('45 000 FCFA')).toBeTruthy();
    });

    it('labels an overspent month as over budget and shows the shortfall unsigned', () => {
      renderCard({ summary: OVERSPENT });
      expect(screen.getByText('Over your plan by')).toBeTruthy();
      expect(screen.getByText('5 000 FCFA')).toBeTruthy();
    });

    it('tints the figure with DANGER when over budget', () => {
      renderCard({ summary: OVERSPENT });
      const amount = screen.getByTestId('month-overview-amount');
      expect(StyleSheet.flatten(amount.props.style).color).toBe(DANGER);
    });

    it('shows the spent-of-budget caption and percentage', () => {
      renderCard();
      expect(screen.getByText('20 000 FCFA of 65 000 FCFA spent')).toBeTruthy();
      expect(screen.getByText('31%')).toBeTruthy();
    });

    it('fills the progress bar to the spent percentage', () => {
      renderCard();
      expect(screen.getByTestId('budget-progress-fill').props.accessibilityValue.now).toBe(31);
    });

    it('tints the pace chip by pace level', () => {
      renderCard();
      expect(
        StyleSheet.flatten(screen.getByTestId('budget-pace-chip').props.style).backgroundColor,
      ).toBe(SUCCESS_LIGHT);

      screen.unmount();
      renderCard({ summary: NEARLY_SPENT });
      expect(
        StyleSheet.flatten(screen.getByTestId('budget-pace-chip').props.style).backgroundColor,
      ).toBe(WARNING_LIGHT);

      screen.unmount();
      renderCard({ summary: OVERSPENT });
      expect(
        StyleSheet.flatten(screen.getByTestId('budget-pace-chip').props.style).backgroundColor,
      ).toBe(DANGER_LIGHT);
    });

    it('names the pace in the same words as the Budget tab (UX-01)', () => {
      renderCard();
      expect(screen.getByTestId('budget-pace-chip')).toHaveTextContent('On track');

      screen.unmount();
      renderCard({ summary: NEARLY_SPENT });
      expect(screen.getByTestId('budget-pace-chip')).toHaveTextContent('Watch out');

      screen.unmount();
      renderCard({ summary: OVERSPENT });
      expect(screen.getByTestId('budget-pace-chip')).toHaveTextContent('Over budget');
    });

    it('offers no "set a budget" prompt', () => {
      renderCard();
      expect(screen.queryByTestId('month-overview-set-budget')).toBeNull();
    });
  });

  describe('with no plan yet (UX-04)', () => {
    it('leads with what was spent this month, a fact rather than a limit', () => {
      renderCard({ summary: UNPLANNED });
      expect(screen.getByText('Spent this month')).toBeTruthy();
      expect(screen.getByTestId('month-overview-amount')).toHaveTextContent('20 000 FCFA');
      expect(screen.queryByText('Left in your plan')).toBeNull();
    });

    it('does not dress income up as a plan: no bar, no pace chip, no "spent of"', () => {
      renderCard({ summary: UNPLANNED });
      expect(screen.queryByTestId('budget-progress')).toBeNull();
      expect(screen.queryByTestId('budget-pace-chip')).toBeNull();
      expect(screen.queryByText(/spent$/)).toBeNull();
    });

    it('says how many days of the month are logged so far', () => {
      renderCard({ summary: UNPLANNED });
      expect(screen.getByTestId('month-overview-logging')).toHaveTextContent('18 of 23 days logged');
    });

    it('says "1 of 1 day logged" on the first day of the month', () => {
      renderCard({ summary: UNPLANNED, logging: { loggedDays: 1, daysSoFar: 1 } });
      expect(screen.getByTestId('month-overview-logging')).toHaveTextContent('1 of 1 day logged');
    });

    it('shows the money that came in on its own line', () => {
      renderCard({ summary: UNPLANNED });
      expect(screen.getByTestId('month-overview-income')).toHaveTextContent(
        'Money in this month: 100 000 FCFA',
      );
    });

    it('keeps planning one quiet tap away', () => {
      const { onSetBudget } = renderCard({ summary: UNPLANNED });
      fireEvent.press(screen.getByTestId('month-overview-set-budget'));
      expect(onSetBudget).toHaveBeenCalledTimes(1);
    });

    it('reads in French', async () => {
      await i18n.changeLanguage('fr');
      renderCard({ summary: UNPLANNED });
      expect(screen.getByText('Dépensé ce mois-ci')).toBeTruthy();
      expect(screen.getByTestId('month-overview-logging')).toHaveTextContent('Jours notés : 18 sur 23');
    });
  });

  describe('cashflow row', () => {
    it('renders money in and money out, and no net (UX-04)', () => {
      renderCard();
      expect(screen.getByText('In')).toBeTruthy();
      expect(screen.getByText('Out')).toBeTruthy();
      expect(screen.queryByText('Net')).toBeNull();
      expect(screen.getByText('100 000 FCFA')).toBeTruthy();
      expect(screen.getByText('20 000 FCFA')).toBeTruthy();
    });
  });

  it('is addressable by testID', () => {
    renderCard();
    expect(screen.getByTestId('month-overview-card')).toBeTruthy();
  });

  it('summarises the month in French, with a pluralised day count', async () => {
    await i18n.changeLanguage('fr');
    renderCard();
    expect(screen.getByText('SEPTEMBRE')).toBeTruthy();
    expect(screen.getByText('6 jours restants')).toBeTruthy();
    expect(screen.getByText('Reste au budget')).toBeTruthy();
    expect(screen.getByText('Entrées')).toBeTruthy();
  });

  it('says "1 jour restant" on the penultimate day', async () => {
    await i18n.changeLanguage('fr');
    renderCard({ daysRemaining: 1 });
    expect(screen.getByText('1 jour restant')).toBeTruthy();
  });

  describe('imprévus line', () => {
    it('shows how many imprévus the month has and what they cost', () => {
      renderCard({ unplanned: { count: 2, total: 10000 } });
      expect(screen.getByTestId('month-overview-unplanned')).toHaveTextContent(
        '2 unexpected expenses · 10 000 FCFA',
      );
    });

    it('stays out of the way while the month has none', () => {
      renderCard({ unplanned: { count: 0, total: 0 } });
      expect(screen.queryByTestId('month-overview-unplanned')).toBeNull();
    });

    it('reads in French', async () => {
      await i18n.changeLanguage('fr');
      renderCard({ unplanned: { count: 1, total: 3000 } });
      expect(screen.getByTestId('month-overview-unplanned')).toHaveTextContent(
        '1 imprévu · 3 000 FCFA',
      );
    });
  });
});
