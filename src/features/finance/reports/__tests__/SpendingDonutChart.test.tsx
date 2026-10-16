import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { SpendingDonutChart } from '@/features/finance/reports/SpendingDonutChart';
import type { CategorySpend } from '@/features/finance/reports/reports.types';

const DATA: CategorySpend[] = [
  { categoryId: 1, categoryLabel: 'Food', amount: 7000, pct: 70 },
  { categoryId: 2, categoryLabel: 'Transport', amount: 3000, pct: 30 },
];

describe('SpendingDonutChart', () => {
  it('renders the chart with a centered grouped total', () => {
    render(<SpendingDonutChart data={DATA} />);
    expect(screen.getByTestId('spending-donut-chart')).toBeTruthy();
    expect(screen.getByText(/total/i)).toBeTruthy();
    expect(screen.getByText('10 000')).toBeTruthy();
    expect(screen.getByText('FCFA')).toBeTruthy();
  });

  it('draws one arc per category', () => {
    render(<SpendingDonutChart data={DATA} />);
    expect(screen.getAllByTestId(/^donut-slice-/).length).toBe(2);
  });

  it('renders an empty-state message when data is empty', () => {
    render(<SpendingDonutChart data={[]} />);
    expect(screen.getByText(/no data/i)).toBeTruthy();
  });

  it('leaves out a category that refunds turned negative for the month (VS-45)', () => {
    render(
      <SpendingDonutChart
        data={[...DATA, { categoryId: 3, categoryLabel: 'Shopping', amount: -2000, pct: -20 }]}
      />,
    );
    expect(screen.getAllByTestId(/^donut-slice-/).length).toBe(2);
    expect(screen.getByText('10 000')).toBeTruthy();
  });
});
