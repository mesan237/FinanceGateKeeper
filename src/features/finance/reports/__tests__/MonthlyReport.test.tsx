import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type {
  MonthComparison as MonthComparisonData,
  MonthlyReport as MonthlyReportData,
} from '@/features/finance/reports/reports.types';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
    // Runs the focus callback once on mount, as a first focus would.
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

// The estimate comparison has its own tests (VS-46).
// The net worth card has its own suite (networth/__tests__/NetWorthCard.test.tsx).
jest.mock('@/features/finance/networth/NetWorthCard', () => ({ NetWorthCard: () => null }));

jest.mock('@/features/finance/budget/budget.baseline', () => ({
  getBaseline: jest.fn().mockResolvedValue(null),
  setBaselineFact: jest.fn(),
}));

const mockGetProfile = jest.fn();
jest.mock('@/features/finance/reports/reports.profile', () => ({
  ...jest.requireActual('@/features/finance/reports/reports.profile'),
  getSpendingProfile: () => mockGetProfile(),
}));

const mockGetStartingPoint = jest.fn();
jest.mock('@/features/finance/reports/reports.startingPoint', () => ({
  getStartingPoint: () => mockGetStartingPoint(),
}));

jest.mock('@/features/finance/reports/reports.service', () => ({
  getMonthlyReport: jest.fn(),
  expenseSpentPct: jest.requireActual<typeof import('@/features/finance/reports/reports.service')>(
    '@/features/finance/reports/reports.service',
  ).expenseSpentPct,
}));

import { MonthlyReport } from '@/features/finance/reports/MonthlyReport';
import i18n from '@/i18n';
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
    unplanned: { count: 0, total: 0, sharePct: 0, previous: { count: 0, total: 0 } },
    debtSummary: { totalLent: 30000, totalOwed: 12000 },
    comparison: null,
    why: { totals: { routine: 0, event: 0, unexpected: 0, everyday: 0 }, events: [] },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMonthly.mockResolvedValue(buildReport());
  // No profile by default: the other suites are about the month's report.
  mockGetProfile.mockResolvedValue(null);
  mockGetStartingPoint.mockResolvedValue({ recorded: [], needed: 3, profile: null });
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
  describe('loading, empty and error states (UX-16)', () => {
    it('shows a skeleton shaped like the report on a first load', () => {
      mockGetMonthly.mockReturnValue(new Promise(() => {}));
      render(<MonthlyReport />);

      expect(screen.getByTestId('report-skeleton')).toBeTruthy();
    });

    it('shows the shared error with "Try again", which reloads the month', async () => {
      mockGetMonthly.mockRejectedValue(new Error('disk'));
      render(<MonthlyReport />);

      expect(await screen.findByTestId('report-error')).toBeTruthy();
      expect(screen.getByText("Couldn't load this report")).toBeTruthy();

      mockGetMonthly.mockResolvedValue(buildReport());
      fireEvent.press(screen.getByTestId('report-error-retry'));

      expect(await screen.findByText('400 000 FCFA')).toBeTruthy();
      expect(screen.queryByTestId('report-error')).toBeNull();
    });

    it('says a month with nothing logged is empty, and leads to Transactions', async () => {
      mockGetMonthly.mockResolvedValue(
        buildReport({
          incomeTotal: 0,
          expensePerformance: { planned: 0, actual: 0, remaining: 0 },
          categoryBreakdown: [],
        }),
      );
      render(<MonthlyReport />);

      expect(await screen.findByTestId('report-empty')).toBeTruthy();
      expect(screen.getByText('Nothing logged in June 2026')).toBeTruthy();
      expect(screen.queryByTestId('expense-performance-bar')).toBeNull();
      fireEvent.press(screen.getByTestId('report-empty-action'));
      expect(mockPush).toHaveBeenCalledWith('/transactions');
    });

    it('reads the empty month in French', async () => {
      await i18n.changeLanguage('fr');
      mockGetMonthly.mockResolvedValue(
        buildReport({
          incomeTotal: 0,
          expensePerformance: { planned: 0, actual: 0, remaining: 0 },
          categoryBreakdown: [],
        }),
      );
      render(<MonthlyReport />);

      expect(await screen.findByText('Rien de noté en Juin 2026')).toBeTruthy();
      expect(screen.getByText('Voir les transactions')).toBeTruthy();
    });

    it('re-reads the month when the tab comes into focus', async () => {
      render(<MonthlyReport />);
      await screen.findByText('400 000 FCFA');

      await waitFor(() => expect(mockGetMonthly.mock.calls.length).toBeGreaterThanOrEqual(2));
    });
  });

  it('renders the month label', async () => {
    render(<MonthlyReport />);
    expect(await screen.findByText('June 2026')).toBeTruthy();
  });

  it('renders the income total and the total expenses', async () => {
    render(<MonthlyReport />);
    expect(await screen.findByText('400 000 FCFA')).toBeTruthy();
    expect(screen.getAllByText('53 000 FCFA').length).toBeGreaterThan(0);
  });

  it('sets the month against its plan, in the same words as the Budget tab (UX-01)', async () => {
    render(<MonthlyReport />);
    await screen.findByText('June 2026');
    expect(screen.getByText('The month against your plan')).toBeTruthy();
    // "Planned" is kept for planned purchases; the month's plan is its budget.
    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.queryByText(/^planned$/i)).toBeNull();
    expect(screen.getByText('Spent')).toBeTruthy();
    expect(screen.getByText('Left in your plan')).toBeTruthy();
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

  it('opens the category detail for the month from its row (VS-56)', async () => {
    render(<MonthlyReport />);
    fireEvent.press(await screen.findByTestId('month-category-1'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/budget/category/[id]',
      params: { id: '1', month: '2026-06' },
    });
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

    // The mount and the first focus each read the month; the arrow adds one more.
    const before = mockGetMonthly.mock.calls.length;
    fireEvent.press(screen.getByTestId('month-nav-prev'));

    await waitFor(() => expect(mockGetMonthly).toHaveBeenCalledTimes(before + 1));
    const secondArg = mockGetMonthly.mock.calls[before][0];
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

  it('renders the report in French, translating seeded category names', async () => {
    await i18n.changeLanguage('fr');
    mockGetMonthly.mockResolvedValue(buildReport({ comparison: COMPARISON }));
    render(<MonthlyReport />);
    expect(await screen.findByText('Juin 2026')).toBeTruthy();
    expect(screen.getByText('Dépenses par catégorie')).toBeTruthy();
    expect(screen.getAllByText('Alimentation').length).toBeGreaterThan(0);
    expect(screen.getByText('62 % du total')).toBeTruthy();
  });

  describe('imprévus card', () => {
    const WITH_UNPLANNED = {
      count: 3,
      total: 21000,
      sharePct: 40,
      previous: { count: 1, total: 5000 },
    };

    it('shows how many imprévus the month had, their cost and their share', async () => {
      mockGetMonthly.mockResolvedValue(buildReport({ unplanned: WITH_UNPLANNED }));
      render(<MonthlyReport />);

      expect(await screen.findByText('3 unexpected expenses')).toBeTruthy();
      expect(screen.getByTestId('unplanned-total')).toHaveTextContent('21 000 FCFA');
      expect(screen.getByText("40% of this month's spending")).toBeTruthy();
      expect(screen.getByText('Last month: 1 · 5 000 FCFA')).toBeTruthy();
    });

    it('says "under 1%" for a tiny share instead of a misleading 0%', async () => {
      mockGetMonthly.mockResolvedValue(
        buildReport({ unplanned: { ...WITH_UNPLANNED, count: 1, total: 100, sharePct: 0.2 } }),
      );
      render(<MonthlyReport />);

      expect(await screen.findByText("Under 1% of this month's spending")).toBeTruthy();
    });

    it('rounds an ordinary share to a whole percentage', async () => {
      mockGetMonthly.mockResolvedValue(
        buildReport({ unplanned: { ...WITH_UNPLANNED, sharePct: 33.4 } }),
      );
      render(<MonthlyReport />);

      expect(await screen.findByText("33% of this month's spending")).toBeTruthy();
    });

    it('says so when the month had no imprévus, and how to record one', async () => {
      render(<MonthlyReport />);

      expect(await screen.findByText('No unexpected expenses this month.')).toBeTruthy();
      expect(screen.getByText(/Turn on "Unexpected"/)).toBeTruthy();
      expect(screen.queryByTestId('unplanned-total')).toBeNull();
    });

    it('reads in French', async () => {
      await i18n.changeLanguage('fr');
      mockGetMonthly.mockResolvedValue(buildReport({ unplanned: WITH_UNPLANNED }));
      render(<MonthlyReport />);

      expect(await screen.findByText('3 imprévus')).toBeTruthy();
      expect(screen.getByText('40 % des dépenses du mois')).toBeTruthy();
    });
  });

  it('shows "your typical month", loaded when the tab comes into focus (VS-41)', async () => {
    mockGetMonthly.mockResolvedValue(buildReport());
    mockGetProfile.mockResolvedValue({
      months: [{ month: '2026-05', coverage: 0.9, isComplete: true }],
      average: { total: 150_000, fixed: 100_000, variable: 50_000, unexpected: 0 },
      incomeAverage: null,
      variableCategories: [],
      fixedCategories: [],
    });

    render(<MonthlyReport />);

    expect(await screen.findByTestId('typical-month-card')).toBeTruthy();
    expect(screen.getByTestId('typical-total')).toHaveTextContent('150 000 FCFA a month');
  });

  it('shows how much of the starting point is recorded in the typical month (VS-58)', async () => {
    mockGetProfile.mockResolvedValue({
      months: [{ month: '2026-05', coverage: 0.9, isComplete: true }],
      average: { total: 150_000, fixed: 100_000, variable: 50_000, unexpected: 0 },
      incomeAverage: null,
      variableCategories: [],
      fixedCategories: [],
    });
    mockGetStartingPoint.mockResolvedValue({ recorded: ['2026-05'], needed: 3, profile: null });

    render(<MonthlyReport />);

    expect(await screen.findByTestId('typical-start-progress')).toHaveTextContent(/1 of 3 months recorded/);
  });

  it('shows why the month went and opens an event behind it (VS-62)', async () => {
    mockGetMonthly.mockResolvedValue(
      buildReport({
        why: {
          totals: { routine: 20_000, event: 33_000, unexpected: 3_000, everyday: 12_000 },
          events: [{ eventId: 4, name: 'Marie’s wedding', amount: 33_000 }],
        },
      }),
    );
    render(<MonthlyReport />);

    expect(await screen.findByTestId('why-everyday')).toHaveTextContent(/Everyday.*12.000 FCFA/);
    fireEvent.press(screen.getByTestId('why-event-4'));
    expect(mockPush).toHaveBeenCalledWith('/events/4');
  });
});
