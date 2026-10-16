import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { TypicalMonthCard } from '@/features/finance/reports/TypicalMonthCard';
import type { SpendingProfile } from '@/features/finance/reports/reports.types';

const PROFILE: SpendingProfile = {
  months: [
    { month: '2026-07', coverage: 0.95, isComplete: true },
    { month: '2026-08', coverage: 0.9, isComplete: true },
    { month: '2026-09', coverage: 0.4, isComplete: false },
  ],
  average: { total: 205_000, fixed: 100_000, variable: 95_000, unexpected: 10_000 },
  variableCategories: [
    { categoryId: 1, categoryLabel: 'Food', average: 60_000, lowest: 50_000, highest: 70_000 },
    { categoryId: 5, categoryLabel: 'Transport', average: 35_000, lowest: 30_000, highest: 40_000 },
  ],
  fixedCategories: [
    { categoryId: 9, categoryLabel: 'Bills', average: 100_000, lowest: 100_000, highest: 100_000 },
  ],
};

beforeEach(() => jest.clearAllMocks());

describe('TypicalMonthCard (VS-41)', () => {
  it('shows the average month and the complete months it is based on', () => {
    render(<TypicalMonthCard profile={PROFILE} />);

    expect(screen.getByText('Your typical month')).toBeTruthy();
    expect(screen.getByTestId('typical-total')).toHaveTextContent('205 000 FCFA a month');
    expect(screen.getByText('Based on 2 complete months: July 2026, August 2026.')).toBeTruthy();
  });

  it('splits the month into fixed, variable and unexpected spending', () => {
    render(<TypicalMonthCard profile={PROFILE} />);

    expect(screen.getByTestId('typical-fixed')).toHaveTextContent('Fixed100 000 FCFA');
    expect(screen.getByTestId('typical-variable')).toHaveTextContent('Variable95 000 FCFA');
    expect(screen.getByTestId('typical-unexpected')).toHaveTextContent('Unexpected10 000 FCFA');
  });

  it('lists variable categories with their range and what new habits could keep', () => {
    render(<TypicalMonthCard profile={PROFILE} />);

    expect(screen.getByText('Where new habits pay off')).toBeTruthy();
    expect(screen.getByTestId('typical-category-1')).toHaveTextContent(/Food/);
    expect(screen.getByText('From 50 000 FCFA to 70 000 FCFA a month')).toBeTruthy();
    // (60 000 − 50 000) + (35 000 − 30 000)
    expect(screen.getByTestId('typical-potential')).toHaveTextContent(/15 000 FCFA a month/);
    expect(screen.getByText('Fixed costs: Bills.')).toBeTruthy();
  });

  it('explains what is missing, month by month, before any month is complete', () => {
    render(
      <TypicalMonthCard
        profile={{
          months: [{ month: '2026-09', coverage: 0.4, isComplete: false }],
          average: null,
          variableCategories: [],
          fixedCategories: [],
        }}
      />,
    );

    expect(screen.getByText('Not enough history yet')).toBeTruthy();
    expect(screen.getByText('September 2026: 40% logged')).toBeTruthy();
    expect(screen.queryByTestId('typical-total')).toBeNull();
  });

  it('links to Categories to set what is fixed or variable', () => {
    render(<TypicalMonthCard profile={PROFILE} />);

    fireEvent.press(screen.getByText('Set categories as fixed or variable'));
    expect(mockPush).toHaveBeenCalledWith('/expenses/categories');
  });
});
