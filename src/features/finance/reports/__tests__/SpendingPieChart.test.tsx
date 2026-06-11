import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { SpendingPieChart } from '@/features/finance/reports/SpendingPieChart';
import type { CategorySpend } from '@/features/finance/reports/reports.types';

const DATA: CategorySpend[] = [
  { categoryId: 1, categoryLabel: 'Food', amount: 5000, pct: 50 },
  { categoryId: 2, categoryLabel: 'Transport', amount: 5000, pct: 50 },
];

describe('SpendingPieChart', () => {
  it('renders the chart when given non-empty data', () => {
    render(<SpendingPieChart data={DATA} />);
    expect(screen.getByTestId('spending-pie-chart')).toBeTruthy();
  });

  it('renders an empty-state message when data is empty', () => {
    render(<SpendingPieChart data={[]} />);
    expect(screen.getByText(/no data/i)).toBeTruthy();
  });
});
