import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { DANGER, DANGER_LIGHT, SUCCESS_LIGHT, SUCCESS_TEXT, WARNING_LIGHT } from '@/constants/colors';
import { MonthOverviewCard } from '@/features/finance/dashboard/MonthOverviewCard';
import type { BudgetSummary, Cashflow } from '@/features/finance/dashboard/dashboard.types';

const FUNDED: BudgetSummary = {
  expenseBudget: 65000,
  expensesLogged: 20000,
  expensesRemaining: 45000,
  spentPct: 31,
  pace: 'green',
};
const NEARLY_SPENT: BudgetSummary = {
  expenseBudget: 65000,
  expensesLogged: 55000,
  expensesRemaining: 10000,
  spentPct: 85,
  pace: 'yellow',
};
const OVERSPENT: BudgetSummary = {
  expenseBudget: 65000,
  expensesLogged: 70000,
  expensesRemaining: -5000,
  spentPct: 100,
  pace: 'red',
};
/** What the service returns before the user has set a budget or logged income. */
const UNSET: BudgetSummary = {
  expenseBudget: 0,
  expensesLogged: 0,
  expensesRemaining: 0,
  spentPct: 0,
  pace: 'green',
};

const CASHFLOW: Cashflow = { income: 100000, expenses: 20000, net: 80000 };
const EMPTY_CASHFLOW: Cashflow = { income: 0, expenses: 0, net: 0 };

function renderCard(overrides: Partial<React.ComponentProps<typeof MonthOverviewCard>> = {}) {
  const onSetBudget = jest.fn();
  render(
    <MonthOverviewCard
      monthISO="2026-09"
      daysRemaining={6}
      summary={FUNDED}
      cashflow={CASHFLOW}
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
    it('leads with what is left to spend', () => {
      renderCard();
      expect(screen.getByText('Left to spend')).toBeTruthy();
      expect(screen.getByText('45 000 FCFA')).toBeTruthy();
    });

    it('labels an overspent month as over budget and shows the shortfall unsigned', () => {
      renderCard({ summary: OVERSPENT });
      expect(screen.getByText('Over budget by')).toBeTruthy();
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

    it('offers no "set a budget" prompt', () => {
      renderCard();
      expect(screen.queryByTestId('month-overview-set-budget')).toBeNull();
    });
  });

  describe('with no budget set', () => {
    it('shows a placeholder instead of a meaningless zero', () => {
      renderCard({ summary: UNSET, cashflow: EMPTY_CASHFLOW });
      expect(screen.getByTestId('month-overview-amount')).toHaveTextContent('— FCFA');
    });

    it('hides the bar, the spent caption and the pace chip, which would all read as "on track"', () => {
      renderCard({ summary: UNSET, cashflow: EMPTY_CASHFLOW });
      expect(screen.queryByTestId('budget-progress')).toBeNull();
      expect(screen.queryByTestId('budget-pace-chip')).toBeNull();
      expect(screen.queryByText(/spent$/)).toBeNull();
    });

    it('prompts the user to set a monthly budget', () => {
      renderCard({ summary: UNSET, cashflow: EMPTY_CASHFLOW });
      expect(screen.getByText('Set a monthly budget to track this')).toBeTruthy();
    });

    it('calls onSetBudget when the prompt is tapped', () => {
      const { onSetBudget } = renderCard({ summary: UNSET, cashflow: EMPTY_CASHFLOW });
      fireEvent.press(screen.getByTestId('month-overview-set-budget'));
      expect(onSetBudget).toHaveBeenCalledTimes(1);
    });
  });

  describe('cashflow row', () => {
    it('renders money in, money out and the net', () => {
      renderCard();
      expect(screen.getByText('In')).toBeTruthy();
      expect(screen.getByText('Out')).toBeTruthy();
      expect(screen.getByText('Net')).toBeTruthy();
      expect(screen.getByText('100 000 FCFA')).toBeTruthy();
      expect(screen.getByText('80 000 FCFA')).toBeTruthy();
    });

    it('colours a surplus green', () => {
      renderCard();
      expect(StyleSheet.flatten(screen.getByTestId('cashflow-net').props.style).color).toBe(
        SUCCESS_TEXT,
      );
    });

    it('colours a deficit in danger', () => {
      renderCard({ cashflow: { income: 5000, expenses: 20000, net: -15000 } });
      expect(screen.getByText('-15 000 FCFA')).toBeTruthy();
      expect(StyleSheet.flatten(screen.getByTestId('cashflow-net').props.style).color).toBe(DANGER);
    });

    it('still renders when no budget is set, since logged activity stands on its own', () => {
      renderCard({ summary: UNSET, cashflow: { income: 0, expenses: 12000, net: -12000 } });
      expect(screen.getByText('12 000 FCFA')).toBeTruthy();
      expect(screen.getByText('-12 000 FCFA')).toBeTruthy();
    });
  });

  it('is addressable by testID', () => {
    renderCard();
    expect(screen.getByTestId('month-overview-card')).toBeTruthy();
  });
});
