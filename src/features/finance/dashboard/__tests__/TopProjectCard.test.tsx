import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { TopProjectCard } from '@/features/finance/dashboard/TopProjectCard';
import type { TopProject } from '@/features/finance/dashboard/dashboard.types';

const TOP_PROJECT: TopProject = {
  project: {
    id: 1,
    name: 'E-commerce Launch',
    targetAmount: 500000,
    fundedAmount: 110000,
    priorityRank: 1,
    deadline: null,
    status: 'active',
    createdAt: '2026-06-01',
  },
  pct: 22,
};

describe('TopProjectCard', () => {
  it('renders the project name and funding percentage', () => {
    render(<TopProjectCard topProject={TOP_PROJECT} />);
    expect(screen.getByText('E-commerce Launch')).toBeTruthy();
    expect(screen.getByText(/22%/)).toBeTruthy();
  });

  it('shows funded and target amounts', () => {
    render(<TopProjectCard topProject={TOP_PROJECT} />);
    expect(screen.getByText('110 000 FCFA of 500 000 FCFA')).toBeTruthy();
  });

  it('renders a progress bar reflecting funded percentage', () => {
    render(<TopProjectCard topProject={TOP_PROJECT} />);
    expect(screen.getByTestId('top-project-progress-fill').props.accessibilityValue.now).toBe(22);
  });

  it('is accessible via testID', () => {
    render(<TopProjectCard topProject={TOP_PROJECT} />);
    expect(screen.getByTestId('top-project-card')).toBeTruthy();
  });
});
