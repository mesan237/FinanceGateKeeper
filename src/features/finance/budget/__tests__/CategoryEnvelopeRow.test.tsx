import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { CategoryEnvelopeRow } from '@/features/finance/budget/CategoryEnvelopeRow';
import type { CategoryBudgetProgress } from '@/features/finance/budget/budget.types';

const FOOD = 1;

function envelope(overrides: Partial<CategoryBudgetProgress> = {}): CategoryBudgetProgress {
  return {
    categoryId: FOOD,
    categoryName: 'Food',
    allocated: 60_000,
    carriedIn: 0,
    available: 60_000,
    spent: 30_000,
    remaining: 30_000,
    consumedPct: 50,
    dailyAverage: 3_000,
    projected: 55_000,
    expectedToDate: 20_000,
    rolloverEnabled: false,
    health: 'on_track',
    ...overrides,
  };
}

function renderRow(e: CategoryBudgetProgress, detailed = false) {
  render(<CategoryEnvelopeRow envelope={e} first onPress={jest.fn()} detailed={detailed} />);
}

describe('CategoryEnvelopeRow (UX-13)', () => {
  it('is two lines on the Budget tab: name and what is left, then the paced bar', () => {
    renderRow(envelope());

    expect(screen.getByText('Food')).toBeTruthy();
    expect(screen.getByText('30 000 FCFA')).toBeTruthy();
    expect(screen.getByTestId(`envelope-meter-${FOOD}-marker`)).toBeTruthy();
    expect(screen.queryByText('30 000 FCFA of 60 000 FCFA')).toBeNull();
    expect(screen.queryByTestId(`envelope-projected-${FOOD}`)).toBeNull();
  });

  it('adds the run-rate line only when the envelope is at risk', () => {
    renderRow(envelope({ health: 'at_risk', projected: 90_000 }));

    expect(screen.getByTestId(`envelope-projected-${FOOD}`)).toHaveTextContent('heading for ≈ 90 000 FCFA');
    expect(screen.getByText('50% used · 3 000 FCFA/day')).toBeTruthy();
  });

  it('adds the run-rate line when the envelope is over', () => {
    renderRow(envelope({ health: 'over', spent: 70_000, remaining: -10_000, consumedPct: 117 }));

    expect(screen.getByTestId(`envelope-projected-${FOOD}`)).toBeTruthy();
  });

  it('marks a rolling envelope with a small icon that says what it means', () => {
    renderRow(envelope({ rolloverEnabled: true }));

    expect(screen.getByTestId(`envelope-rollover-${FOOD}`)).toBeTruthy();
    expect(screen.getByLabelText('Rolls over to next month')).toBeTruthy();
  });

  it('keeps the full picture in the category detail', () => {
    renderRow(envelope(), true);

    expect(screen.getByText('30 000 FCFA of 60 000 FCFA')).toBeTruthy();
    expect(screen.getByTestId(`envelope-projected-${FOOD}`)).toBeTruthy();
  });

  it('still names a category with spending but no budget', () => {
    renderRow(envelope({ allocated: 0, available: 0, spent: 9_000, remaining: -9_000 }));

    expect(screen.getByText('No budget set')).toBeTruthy();
    expect(screen.getByText('9 000 FCFA')).toBeTruthy();
  });
});
