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
  expenseSpentPct: jest.requireActual<typeof import('@/features/finance/reports/reports.service')>(
    '@/features/finance/reports/reports.service',
  ).expenseSpentPct,
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
    categoryBreakdown: [
      { categoryId: 1, categoryLabel: 'Food', amount: 33000, pct: 62.3 },
      { categoryId: 2, categoryLabel: 'Transport', amount: 20000, pct: 37.7 },
    ],
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

// This suite asserts on calendar labels and on "the current month", so it pins
// the clock rather than inheriting the wall clock — which is what silently
// turned it red once real time moved past the month the fixtures assume.
// Only `Date` is faked; every timer stays real so RNTL's `waitFor` is unaffected.
const DO_NOT_FAKE = [
  'hrtime',
  'nextTick',
  'performance',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;

beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-06-15T12:00:00.000Z'), doNotFake: [...DO_NOT_FAKE] });
});

afterAll(() => {
  jest.useRealTimers();
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

  it('renders the expense performance section with the segmented bar', async () => {
    render(<MonthlyReport />);
    await screen.findByText('June 2026');
    expect(screen.getByText(/planned/i)).toBeTruthy();
    expect(screen.getByText(/actual spending/i)).toBeTruthy();
    expect(screen.getByText(/remaining budget/i)).toBeTruthy();
    expect(screen.getByText('207 000 FCFA')).toBeTruthy();
    expect(screen.getByTestId('expense-performance-bar')).toBeTruthy();
  });

  it('renders the spending donut and rich category rows', async () => {
    render(<MonthlyReport />);
    await screen.findByText('June 2026');
    expect(screen.getByTestId('spending-donut-chart')).toBeTruthy();
    // 62.3% rounds to 62; the row shows the "% of total" sub-label.
    expect(screen.getByText('62% of total')).toBeTruthy();
    expect(screen.getByTestId('report-category-icon-1')).toBeTruthy();
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
