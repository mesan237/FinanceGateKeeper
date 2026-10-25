import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { MonthComparison } from '@/features/finance/reports/MonthComparison';
import type { MonthComparison as MonthComparisonData } from '@/features/finance/reports/reports.types';

const POPULATED: MonthComparisonData = {
  month: '2026-06',
  previousMonth: '2026-05',
  categories: [
    { categoryId: 1, categoryLabel: 'Food', current: 12000, previous: 10000, pctChange: 20 },
    { categoryId: 2, categoryLabel: 'Transport', current: 4000, previous: 8000, pctChange: -50 },
    { categoryId: 3, categoryLabel: 'Shopping', current: 3000, previous: 0, pctChange: null },
  ],
};

describe('MonthComparison', () => {
  it('renders the "vs previous month" section header', () => {
    render(<MonthComparison comparison={POPULATED} />);
    expect(screen.getByText(/vs previous month/i)).toBeTruthy();
  });

  it('renders a row per category for non-empty data', () => {
    render(<MonthComparison comparison={POPULATED} />);
    expect(screen.getByText('Food')).toBeTruthy();
    expect(screen.getByText('Transport')).toBeTruthy();
    expect(screen.getByText('Shopping')).toBeTruthy();
  });

  it('shows the three biggest changes first, by amount (UX-14)', () => {
    const many: MonthComparisonData = {
      ...POPULATED,
      categories: [
        { categoryId: 1, categoryLabel: 'Food', current: 12000, previous: 10000, pctChange: 20 },
        { categoryId: 2, categoryLabel: 'Transport', current: 4000, previous: 8000, pctChange: -50 },
        { categoryId: 3, categoryLabel: 'Shopping', current: 3000, previous: 0, pctChange: null },
        { categoryId: 4, categoryLabel: 'Bills', current: 20000, previous: 19500, pctChange: 2.6 },
        { categoryId: 5, categoryLabel: 'Health', current: 9000, previous: 1000, pctChange: 800 },
      ],
    };
    render(<MonthComparison comparison={many} />);

    // Changes: Health +8 000, Transport −4 000, Shopping +3 000, Food +2 000, Bills +500.
    expect(screen.getByTestId('comparison-row-5')).toBeTruthy();
    expect(screen.getByTestId('comparison-row-2')).toBeTruthy();
    expect(screen.getByTestId('comparison-row-3')).toBeTruthy();
    expect(screen.queryByTestId('comparison-row-1')).toBeNull();
    expect(screen.queryByTestId('comparison-row-4')).toBeNull();

    fireEvent.press(screen.getByTestId('comparison-show-all'));

    expect(screen.getByTestId('comparison-row-1')).toBeTruthy();
    expect(screen.getByTestId('comparison-row-4')).toBeTruthy();
  });

  it('offers no "Show all" when every change already shows', () => {
    render(<MonthComparison comparison={POPULATED} />);
    expect(screen.queryByTestId('comparison-show-all')).toBeNull();
  });

  it('renders an empty state when categories is empty', () => {
    render(<MonthComparison comparison={{ ...POPULATED, categories: [] }} />);
    expect(screen.getByText(/no comparison data/i)).toBeTruthy();
  });
});
