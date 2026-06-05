import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { OverBudgetAlert } from '@/features/finance/budget/OverBudgetAlert';

describe('OverBudgetAlert', () => {
  it('shows the formatted overage and both actions when visible', () => {
    render(
      <OverBudgetAlert visible overage={3000} onProceed={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.getByText(/3 000 FCFA/)).toBeTruthy();
    expect(screen.getByTestId('over-budget-proceed')).toBeTruthy();
    expect(screen.getByTestId('over-budget-cancel')).toBeTruthy();
  });

  it('fires onProceed when Proceed is pressed', () => {
    const onProceed = jest.fn();
    render(
      <OverBudgetAlert visible overage={3000} onProceed={onProceed} onCancel={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('over-budget-proceed'));
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel when Cancel is pressed', () => {
    const onCancel = jest.fn();
    render(
      <OverBudgetAlert visible overage={3000} onProceed={jest.fn()} onCancel={onCancel} />,
    );
    fireEvent.press(screen.getByTestId('over-budget-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when not visible', () => {
    render(
      <OverBudgetAlert visible={false} overage={3000} onProceed={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.queryByTestId('over-budget-proceed')).toBeNull();
  });
});
