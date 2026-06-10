import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type {
  MonthComparison as MonthComparisonData,
  MonthlyReport as MonthlyReportData,
} from '@/features/finance/reports/reports.types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/features/finance/reports/reports.service', () => ({
  getMonthlyReport: jest.fn(),
}));

import { MonthlyReport } from '@/features/finance/reports/MonthlyReport';
import * as reportsService from '@/features/finance/reports/reports.service';

const mockGetMonthly = reportsService.getMonthlyReport as jest.MockedFunction<
  typeof reportsService.getMonthlyReport
>;

const COMPARISON: MonthComparisonData = {
  month: '2026-06',
  previousMonth: '2026-05',
  categories: [
    { categoryId: 1, categoryLabel: 'Food', current: 30000, previous: 20000, pctChange: 50 },
  ],
};

function buildReport(overrides: Partial<MonthlyReportData> = {}): MonthlyReportData {
  return {
    month: '2026-06',
    incomeTotal: 400000,
    expensePerformance: { planned: 260000, actual: 53000, remaining: 207000 },
    allocatedBreakdown: { emergencyFund: 40000, savings: 35000, projects: 60000, expenses: 260000 },
    categoryBreakdown: [
      { categoryId: 1, categoryLabel: 'Food', amount: 33000, pct: 62.3 },
      { categoryId: 2, categoryLabel: 'Transport', amount: 20000, pct: 37.7 },
    ],
    fundProgress: [
      { type: 'emergency', current: 40000, target: 100000, pct: 40 },
      { type: 'savings', current: 25000, target: null, pct: null },
    ],
    projectProgress: [{ id: 1, name: 'Laptop', funded: 250000, target: 500000, pct: 50 }],
    debtSummary: { totalLent: 30000, totalOwed: 12000 },
    comparison: null,
    suggestions: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMonthly.mockResolvedValue(buildReport());
});

describe('MonthlyReport', () => {
  it('renders the month label', async () => {
    render(<MonthlyReport />);
    expect(await screen.findByText('June 2026')).toBeTruthy();
  });

  it('renders the income total and the total expenses', async () => {
    render(<MonthlyReport />);
    expect(await screen.findByText('400 000 FCFA')).toBeTruthy();
    expect(screen.getAllByText('53 000 FCFA').length).toBeGreaterThan(0);
  });

  it('renders the expense performance section', async () => {
    render(<MonthlyReport />);
    await screen.findByText('June 2026');
    expect(screen.getByText(/planned/i)).toBeTruthy();
    expect(screen.getByText(/remaining/i)).toBeTruthy();
    expect(screen.getByText('207 000 FCFA')).toBeTruthy();
  });

  it('renders the optimization suggestions empty state', async () => {
    render(<MonthlyReport />);
    expect(await screen.findByText(/no suggestions/i)).toBeTruthy();
  });

  it('renders the month comparison when comparison data is present', async () => {
    mockGetMonthly.mockResolvedValue(buildReport({ comparison: COMPARISON }));
    render(<MonthlyReport />);
    expect(await screen.findByText(/vs previous month/i)).toBeTruthy();
  });

  it('does not render the month comparison when comparison is null', async () => {
    render(<MonthlyReport />);
    await screen.findByText('June 2026');
    expect(screen.queryByText(/vs previous month/i)).toBeNull();
  });

  it('prev arrow navigates to the previous month', async () => {
    render(<MonthlyReport />);
    await screen.findByText('June 2026');
    const firstArg = mockGetMonthly.mock.calls[0][0];

    fireEvent.press(screen.getByTestId('month-nav-prev'));

    await waitFor(() => expect(mockGetMonthly).toHaveBeenCalledTimes(2));
    const secondArg = mockGetMonthly.mock.calls[1][0];
    expect(secondArg < firstArg).toBe(true);
  });

  it('disables the next arrow on the current month', async () => {
    render(<MonthlyReport />);
    await screen.findByText('June 2026');
    expect(screen.getByTestId('month-nav-next').props.accessibilityState.disabled).toBe(true);
  });

  it('navigates to the weekly report when the link is pressed', async () => {
    render(<MonthlyReport />);
    await screen.findByText('June 2026');
    fireEvent.press(screen.getByTestId('view-weekly-link'));
    expect(mockPush).toHaveBeenCalledWith('/reports/weekly');
  });
});
