import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { SpendingBarChart } from '@/features/finance/reports/SpendingBarChart';

describe('SpendingBarChart', () => {
  it('renders the chart when given non-empty data', () => {
    render(<SpendingBarChart labels={['Mon', 'Tue']} values={[1000, 2000]} />);
    expect(screen.getByTestId('spending-bar-chart')).toBeTruthy();
  });

  it('renders nothing when data is empty', () => {
    render(<SpendingBarChart labels={[]} values={[]} />);
    expect(screen.queryByTestId('spending-bar-chart')).toBeNull();
  });
});
