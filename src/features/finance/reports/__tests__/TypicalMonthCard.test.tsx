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
  incomeAverage: 250_000,
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
          incomeAverage: null,
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

  it('labels the figures provisional until three months are complete (VS-46)', () => {
    render(<TypicalMonthCard profile={PROFILE} />);
    expect(screen.getByTestId('typical-confidence')).toHaveTextContent('Provisional');

    render(
      <TypicalMonthCard
        profile={{
          ...PROFILE,
          months: [
            { month: '2026-07', coverage: 0.9, isComplete: true },
            { month: '2026-08', coverage: 0.9, isComplete: true },
            { month: '2026-09', coverage: 0.9, isComplete: true },
          ],
        }}
      />,
    );
    expect(screen.getByTestId('typical-confidence')).toHaveTextContent('Reliable');
  });
});

describe('TypicalMonthCard — starting point (VS-58)', () => {
  const START: SpendingProfile = {
    months: [
      { month: '2026-03', coverage: 0.9, isComplete: true },
      { month: '2026-04', coverage: 0.95, isComplete: true },
      { month: '2026-05', coverage: 1, isComplete: true },
    ],
    average: { total: 250_000, fixed: 100_000, variable: 130_000, unexpected: 20_000 },
    incomeAverage: 250_000,
    variableCategories: [
      { categoryId: 1, categoryLabel: 'Food', average: 80_000, lowest: 70_000, highest: 90_000 },
      { categoryId: 5, categoryLabel: 'Transport', average: 50_000, lowest: 45_000, highest: 55_000 },
    ],
    fixedCategories: [
      { categoryId: 9, categoryLabel: 'Bills', average: 100_000, lowest: 100_000, highest: 100_000 },
    ],
  };
  const READY = { recorded: ['2026-03', '2026-04', '2026-05'], needed: 3, profile: START };

  it('says how many of the three months are recorded while it is being recorded', () => {
    render(<TypicalMonthCard profile={PROFILE} startingPoint={{ recorded: ['2026-07'], needed: 3, profile: null }} />);

    expect(screen.getByTestId('typical-start-progress')).toHaveTextContent(/Starting point: 1 of 3 months recorded/);
    expect(screen.queryByTestId('typical-compare')).toBeNull();
  });

  it('sets now beside the starting point, with the change as a percentage', () => {
    render(<TypicalMonthCard profile={PROFILE} startingPoint={READY} />);

    expect(screen.getByTestId('typical-compare-total')).toHaveTextContent(/Total250 000 FCFA205 000 FCFA−18%/);
    expect(screen.getByTestId('typical-compare-variable')).toHaveTextContent(/130 000 FCFA95 000 FCFA−27%/);
    expect(screen.getByTestId('typical-compare-unexpected')).toHaveTextContent(/−50%/);
    expect(screen.getByTestId('typical-start-months')).toHaveTextContent(/March 2026, April 2026, May 2026/);
    // The comparison carries the "now" figures, so the plain rows are not repeated.
    expect(screen.queryByTestId('typical-fixed')).toBeNull();
  });

  it('compares each category on tap, biggest change first', () => {
    render(<TypicalMonthCard profile={PROFILE} startingPoint={READY} />);
    expect(screen.queryByTestId('typical-compare-category-1')).toBeNull();

    fireEvent.press(screen.getByTestId('typical-compare-toggle'));

    expect(screen.getByTestId('typical-compare-category-1')).toHaveTextContent(/Food80 000 FCFA60 000 FCFA−25%/);
    expect(screen.getByTestId('typical-compare-category-5')).toHaveTextContent(/−30%/);
    expect(screen.getByTestId('typical-compare-category-9')).toHaveTextContent(/0%/);
  });

  it('says there is nothing to compare while now and the starting point are the same months', () => {
    const same = { recorded: ['2026-07', '2026-08', '2026-09'], needed: 3, profile: { ...PROFILE } };
    render(<TypicalMonthCard profile={PROFILE} startingPoint={same} />);

    expect(screen.getByTestId('typical-start-same')).toBeTruthy();
    expect(screen.queryByTestId('typical-compare')).toBeNull();
  });
});
