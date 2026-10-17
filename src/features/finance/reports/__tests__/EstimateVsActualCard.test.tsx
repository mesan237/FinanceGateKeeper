import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { EstimateVsActualCard } from '@/features/finance/reports/EstimateVsActualCard';
import type { SpendingProfile } from '@/features/finance/reports/reports.types';

const PROFILE: SpendingProfile = {
  months: [
    { month: '2026-08', coverage: 0.9, isComplete: true },
    { month: '2026-09', coverage: 0.9, isComplete: true },
  ],
  average: { total: 180_000, fixed: 120_000, variable: 55_000, unexpected: 5_000 },
  incomeAverage: 230_000,
  variableCategories: [],
  fixedCategories: [],
};

const ESTIMATES = {
  monthlyIncome: { value: 250_000, source: 'user' as const, setAt: '2026-08-01T08:00:00Z' },
  monthlyEssentials: { value: 140_000, source: 'user' as const, setAt: '2026-08-01T08:00:00Z' },
};

describe('EstimateVsActualCard (VS-46)', () => {
  it('sets each estimate beside what the complete months show', () => {
    render(<EstimateVsActualCard profile={PROFILE} {...ESTIMATES} onAccept={jest.fn()} />);

    expect(screen.getByText('Estimate vs actual')).toBeTruthy();
    expect(screen.getByTestId('estimate-row-income')).toHaveTextContent(/250 000 FCFA/);
    expect(screen.getByTestId('estimate-row-income')).toHaveTextContent(/230 000 FCFA/);
    expect(screen.getByTestId('estimate-row-essentials')).toHaveTextContent(/140 000 FCFA/);
    expect(screen.getByTestId('estimate-row-essentials')).toHaveTextContent(/120 000 FCFA/);
    expect(screen.getByText('Provisional · based on 2 complete months')).toBeTruthy();
  });

  it('offers to adopt the observed figure, but never changes the estimate by itself', () => {
    const onAccept = jest.fn();
    render(<EstimateVsActualCard profile={PROFILE} {...ESTIMATES} onAccept={onAccept} />);

    expect(onAccept).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('estimate-accept-essentials'));
    expect(onAccept).toHaveBeenCalledWith('monthly_essentials', 120_000);
  });

  it('offers nothing when the estimate already matches what happened', () => {
    render(
      <EstimateVsActualCard
        profile={PROFILE}
        monthlyIncome={{ ...ESTIMATES.monthlyIncome, value: 230_000 }}
        monthlyEssentials={ESTIMATES.monthlyEssentials}
        onAccept={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('estimate-accept-income')).toBeNull();
  });

  it('stays hidden without an estimate or without a complete month', () => {
    const { toJSON, rerender } = render(
      <EstimateVsActualCard profile={PROFILE} monthlyIncome={null} monthlyEssentials={null} onAccept={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();

    rerender(
      <EstimateVsActualCard
        profile={{ ...PROFILE, average: null, incomeAverage: null }}
        {...ESTIMATES}
        onAccept={jest.fn()}
      />,
    );
    expect(toJSON()).toBeNull();
  });
});
