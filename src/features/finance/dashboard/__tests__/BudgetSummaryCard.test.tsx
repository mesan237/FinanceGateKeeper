import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { DANGER_LIGHT, SUCCESS_LIGHT, WARNING_LIGHT } from '@/constants/colors';
import { BudgetSummaryCard } from '@/features/finance/dashboard/BudgetSummaryCard';
import type { BudgetSummary } from '@/features/finance/dashboard/dashboard.types';

const GREEN: BudgetSummary = {
  expenseBudget: 65000,
  expensesLogged: 20000,
  expensesRemaining: 45000,
  spentPct: 31,
  pace: 'green',
};
const YELLOW: BudgetSummary = {
  expenseBudget: 65000,
  expensesLogged: 55000,
  expensesRemaining: 10000,
  spentPct: 85,
  pace: 'yellow',
};
const RED: BudgetSummary = {
  expenseBudget: 65000,
  expensesLogged: 70000,
  expensesRemaining: -5000,
  spentPct: 100,
  pace: 'red',
};

describe('BudgetSummaryCard', () => {
  it('renders the remaining amount as formatted FCFA currency', () => {
    render(<BudgetSummaryCard summary={GREEN} />);
    expect(screen.getByText(/45 000 FCFA/)).toBeTruthy();
    expect(screen.getByText(/remaining this month/i)).toBeTruthy();
  });

  it('shows the spent-of-budget caption', () => {
    render(<BudgetSummaryCard summary={GREEN} />);
    expect(screen.getByText('20 000 FCFA of 65 000 FCFA spent')).toBeTruthy();
  });

  it('renders a progress bar reflecting the spent percentage', () => {
    render(<BudgetSummaryCard summary={GREEN} />);
    expect(screen.getByTestId('budget-progress-fill').props.accessibilityValue.now).toBe(31);
  });

  it('uses SUCCESS colour for green pace', () => {
    render(<BudgetSummaryCard summary={GREEN} />);
    const dot = screen.getByTestId('budget-pace-chip');
    expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(SUCCESS_LIGHT);
  });

  it('uses WARNING colour for yellow pace', () => {
    render(<BudgetSummaryCard summary={YELLOW} />);
    const dot = screen.getByTestId('budget-pace-chip');
    expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(WARNING_LIGHT);
  });

  it('uses DANGER colour for red pace', () => {
    render(<BudgetSummaryCard summary={RED} />);
    const dot = screen.getByTestId('budget-pace-chip');
    expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(DANGER_LIGHT);
  });

  it('is accessible via testID', () => {
    render(<BudgetSummaryCard summary={GREEN} />);
    expect(screen.getByTestId('budget-summary-card')).toBeTruthy();
  });
});
