import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { OptimizationSuggestions } from '@/features/finance/reports/OptimizationSuggestions';
import type { OptimizationSuggestion } from '@/features/finance/reports/reports.types';

const SUGGESTIONS: OptimizationSuggestion[] = [
  { type: 'increase', categoryLabel: 'Food', pctChange: 18, message: 'Food spending increased 18% vs last month — review it.' },
  { type: 'increase', categoryLabel: 'Transport', pctChange: 25, message: 'Transport spending increased 25% vs last month — review it.' },
];

describe('OptimizationSuggestions', () => {
  it('renders one item per suggestion', () => {
    render(<OptimizationSuggestions suggestions={SUGGESTIONS} />);
    expect(screen.getByText(SUGGESTIONS[0].message)).toBeTruthy();
    expect(screen.getByText(SUGGESTIONS[1].message)).toBeTruthy();
  });

  it('renders an empty-state message when there are no suggestions', () => {
    render(<OptimizationSuggestions suggestions={[]} />);
    expect(screen.getByText(/no suggestions/i)).toBeTruthy();
  });
});
