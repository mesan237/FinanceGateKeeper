import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/features/finance/funds/FundProgressBar', () => ({
  FundProgressBar: ({ progress, testID }: { progress: { type: string }; testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID ?? `fund-progress-bar-${progress.type}`} />;
  },
}));

import { FundStatusCard } from '@/features/finance/dashboard/FundStatusCard';
import type { FundsSummary } from '@/features/finance/dashboard/dashboard.types';

const MOCK_FUNDS: FundsSummary = {
  emergency: { fundId: 1, type: 'emergency', current: 320000, target: 500000, pct: 64 },
  savings: { fundId: 2, type: 'savings', current: 80000, target: null, pct: null },
};

describe('FundStatusCard', () => {
  it('renders the card with correct testID', () => {
    render(<FundStatusCard funds={MOCK_FUNDS} />);
    expect(screen.getByTestId('fund-status-card')).toBeTruthy();
  });

  it('shows Emergency Fund label', () => {
    render(<FundStatusCard funds={MOCK_FUNDS} />);
    expect(screen.getByText('Emergency Fund')).toBeTruthy();
  });

  it('shows Savings label', () => {
    render(<FundStatusCard funds={MOCK_FUNDS} />);
    expect(screen.getByText('Savings')).toBeTruthy();
  });

  it('renders a progress bar for the emergency fund', () => {
    render(<FundStatusCard funds={MOCK_FUNDS} />);
    expect(screen.getByTestId('fund-status-emergency')).toBeTruthy();
  });

  it('renders a progress bar for savings (no-target path delegated to FundProgressBar)', () => {
    render(<FundStatusCard funds={MOCK_FUNDS} />);
    expect(screen.getByTestId('fund-status-savings')).toBeTruthy();
  });
});
