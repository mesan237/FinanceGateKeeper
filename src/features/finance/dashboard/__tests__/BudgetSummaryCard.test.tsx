import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { DANGER_LIGHT, SUCCESS_LIGHT, WARNING_LIGHT } from '@/constants/colors';
import { BudgetSummaryCard } from '@/features/finance/dashboard/BudgetSummaryCard';

describe('BudgetSummaryCard', () => {
  it('renders the remaining amount as formatted FCFA currency', () => {
    render(
      <BudgetSummaryCard
        summary={{ expenseBudget: 65000, expensesRemaining: 45000, pace: 'green' }}
      />,
    );
    expect(screen.getByText(/45 000 FCFA/)).toBeTruthy();
    expect(screen.getByText(/remaining this month/i)).toBeTruthy();
  });

  it('uses SUCCESS colour for green pace', () => {
    render(
      <BudgetSummaryCard
        summary={{ expenseBudget: 65000, expensesRemaining: 45000, pace: 'green' }}
      />,
    );
    const dot = screen.getByTestId('budget-pace-chip');
    expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(SUCCESS_LIGHT);
  });

  it('uses WARNING colour for yellow pace', () => {
    render(
      <BudgetSummaryCard
        summary={{ expenseBudget: 65000, expensesRemaining: 10000, pace: 'yellow' }}
      />,
    );
    const dot = screen.getByTestId('budget-pace-chip');
    expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(WARNING_LIGHT);
  });

  it('uses DANGER colour for red pace', () => {
    render(
      <BudgetSummaryCard
        summary={{ expenseBudget: 65000, expensesRemaining: -5000, pace: 'red' }}
      />,
    );
    const dot = screen.getByTestId('budget-pace-chip');
    expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(DANGER_LIGHT);
  });

  it('is accessible via testID', () => {
    render(
      <BudgetSummaryCard
        summary={{ expenseBudget: 65000, expensesRemaining: 45000, pace: 'green' }}
      />,
    );
    expect(screen.getByTestId('budget-summary-card')).toBeTruthy();
  });
});
