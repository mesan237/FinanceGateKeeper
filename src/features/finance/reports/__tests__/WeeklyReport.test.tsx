import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { WeeklyReport as WeeklyReportData } from '@/features/finance/reports/reports.types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/features/finance/reports/reports.service', () => ({
  getWeeklyReport: jest.fn(),
}));

import { WeeklyReport } from '@/features/finance/reports/WeeklyReport';
import * as reportsService from '@/features/finance/reports/reports.service';

const mockGetWeekly = reportsService.getWeeklyReport as jest.MockedFunction<
  typeof reportsService.getWeeklyReport
>;

const REPORT: WeeklyReportData = {
  weekStart: '2026-06-08',
  weekEnd: '2026-06-14',
  totalSpent: 18000,
  totalIncome: 50000,
  topCategories: [
    { categoryId: 1, categoryLabel: 'Food', amount: 10000, pct: 55.6 },
    { categoryId: 2, categoryLabel: 'Transport', amount: 8000, pct: 44.4 },
  ],
  spendingByDay: [
    { date: '2026-06-08', amount: 5000 },
    { date: '2026-06-09', amount: 0 },
    { date: '2026-06-10', amount: 3000 },
    { date: '2026-06-11', amount: 0 },
    { date: '2026-06-12', amount: 4000 },
    { date: '2026-06-13', amount: 0 },
    { date: '2026-06-14', amount: 6000 },
  ],
  peakDay: { date: '2026-06-14', amount: 6000 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetWeekly.mockResolvedValue(REPORT);
});

describe('WeeklyReport', () => {
  it('renders the week label', async () => {
    render(<WeeklyReport />);
    expect(await screen.findByText(/8 Jun/)).toBeTruthy();
  });

  it('renders the total spent with FCFA formatting', async () => {
    render(<WeeklyReport />);
    expect(await screen.findByText('18 000 FCFA')).toBeTruthy();
  });

  it('renders each top category by name', async () => {
    render(<WeeklyReport />);
    expect(await screen.findByText('Food')).toBeTruthy();
    expect(screen.getByText('Transport')).toBeTruthy();
  });

  it('prev arrow navigates to the previous week', async () => {
    render(<WeeklyReport />);
    await screen.findByText('Food');
    const firstArg = mockGetWeekly.mock.calls[0][0];

    fireEvent.press(screen.getByTestId('week-nav-prev'));

    await waitFor(() => expect(mockGetWeekly).toHaveBeenCalledTimes(2));
    const secondArg = mockGetWeekly.mock.calls[1][0];
    expect(new Date(secondArg).getTime()).toBeLessThan(new Date(firstArg).getTime());
  });

  it('disables the next arrow when viewing the current week', async () => {
    render(<WeeklyReport />);
    await screen.findByText('Food');
    expect(screen.getByTestId('week-nav-next').props.accessibilityState.disabled).toBe(true);
  });
});
