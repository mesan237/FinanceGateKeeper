import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { PRIMARY_GREEN } from '@/constants/colors';
import { SpendingSparkline } from '@/features/finance/dashboard/SpendingSparkline';

describe('SpendingSparkline', () => {
  it('renders one bar per day with today (the last bar) highlighted', () => {
    render(<SpendingSparkline values={[0, 1000, 0, 2500, 0, 0, 5000]} testID="spark" />);

    expect(screen.getByTestId('spark')).toBeTruthy();
    for (let i = 0; i < 7; i += 1) {
      expect(screen.getByTestId(`spark-bar-${i}`)).toBeTruthy();
    }
    const today = StyleSheet.flatten(screen.getByTestId('spark-bar-6').props.style);
    expect(today.backgroundColor).toBe(PRIMARY_GREEN);
  });

  it('scales bar heights against the busiest day', () => {
    render(<SpendingSparkline values={[0, 0, 0, 0, 0, 2500, 5000]} testID="spark" />);

    const mid = StyleSheet.flatten(screen.getByTestId('spark-bar-5').props.style);
    const max = StyleSheet.flatten(screen.getByTestId('spark-bar-6').props.style);
    expect(max.height).toBe(28);
    expect(mid.height).toBe(14);
  });

  it('renders nothing when there is no spending in the window', () => {
    render(<SpendingSparkline values={[0, 0, 0, 0, 0, 0, 0]} testID="spark" />);

    expect(screen.queryByTestId('spark')).toBeNull();
  });
});
