import { render, screen } from '@testing-library/react-native';
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

  it('renders an empty state when categories is empty', () => {
    render(<MonthComparison comparison={{ ...POPULATED, categories: [] }} />);
    expect(screen.getByText(/no comparison data/i)).toBeTruthy();
  });
});
