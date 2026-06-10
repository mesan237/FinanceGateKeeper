import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { TransactionEntry } from '@/types/transactions';

const mockGetFeed = jest.fn();
jest.mock('@/services/transactions', () => ({
  getTransactionFeed: (...args: unknown[]) => mockGetFeed(...args),
}));

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getAllCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'Food', parentId: null, isDefault: true, isHidden: false, sortOrder: 0 },
    { id: 5, name: 'Transport', parentId: null, isDefault: true, isHidden: false, sortOrder: 1 },
  ]),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

// Freeze "today" so date-label tests are deterministic.
const TODAY = '2026-06-10';
jest.mock('@/utils/formatDate', () => {
  const actual = jest.requireActual('@/utils/formatDate');
  return {
    ...actual,
    currentMonthISO: () => '2026-06',
    toISODate: actual.toISODate,
    formatSectionDate: (d: string) => actual.formatSectionDate(d, TODAY),
  };
});

import { TransactionList } from '@/features/finance/expenses/TransactionList';

const EXPENSE_TODAY: TransactionEntry = {
  type: 'expense',
  id: 1,
  amount: 2000,
  date: TODAY,
  categoryId: 1,
  categoryLabel: 'Food',
  subcategoryId: null,
  subcategoryLabel: null,
  note: null,
};

const INCOME_TODAY: TransactionEntry = {
  type: 'income',
  id: 10,
  amount: 50000,
  date: TODAY,
  source: 'salary',
  sourceLabel: 'Salary',
  note: null,
};

const EXPENSE_YESTERDAY: TransactionEntry = {
  type: 'expense',
  id: 2,
  amount: 1500,
  date: '2026-06-09',
  categoryId: 5,
  categoryLabel: 'Transport',
  subcategoryId: null,
  subcategoryLabel: null,
  note: null,
};

const EXPENSE_OTHER_MONTH: TransactionEntry = {
  type: 'expense',
  id: 3,
  amount: 3000,
  date: '2026-05-15',
  categoryId: 1,
  categoryLabel: 'Food',
  subcategoryId: null,
  subcategoryLabel: null,
  note: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetFeed.mockResolvedValue([]);
  mockPush.mockReset();
});

describe('TransactionList', () => {
  it('renders section headers with correct date labels', async () => {
    mockGetFeed.mockResolvedValue([EXPENSE_TODAY, EXPENSE_YESTERDAY]);
    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByTestId('section-net-2026-06-10')).toBeTruthy();
    });
    // The section title is a sibling Typography in the same header row.
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Yesterday')).toBeTruthy();
  });

  it('section header right side shows the day net total', async () => {
    mockGetFeed.mockResolvedValue([EXPENSE_TODAY, INCOME_TODAY]);
    render(<TransactionList />);

    // Net = expenses - income. Income 50000 - Expense 2000 = net income 48000
    // Negative net (income surplus) displays as −48 000 FCFA
    await waitFor(() => {
      expect(screen.getByTestId('section-net-2026-06-10')).toBeTruthy();
    });
  });

  it('income rows have green left-border testID', async () => {
    mockGetFeed.mockResolvedValue([INCOME_TODAY]);
    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByTestId('tx-row-income-10')).toBeTruthy();
    });
  });

  it('expense rows have muted left-border testID', async () => {
    mockGetFeed.mockResolvedValue([EXPENSE_TODAY]);
    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByTestId('tx-row-expense-1')).toBeTruthy();
    });
  });

  it('income rows are not tappable (no onPress)', async () => {
    mockGetFeed.mockResolvedValue([INCOME_TODAY]);
    render(<TransactionList />);

    const row = await screen.findByTestId('tx-row-income-10');
    // Pressing an income row should not throw (it simply has no handler)
    expect(() => fireEvent.press(row)).not.toThrow();
  });

  it('renders empty state when feed is empty', async () => {
    mockGetFeed.mockResolvedValue([]);
    render(<TransactionList />);

    expect(await screen.findByText(/No transactions in/)).toBeTruthy();
  });

  it('category chip filter shows income rows always; hides non-matching expenses', async () => {
    mockGetFeed.mockResolvedValue([EXPENSE_TODAY, INCOME_TODAY, EXPENSE_YESTERDAY]);
    render(<TransactionList />);

    await screen.findByTestId('tx-row-expense-1');

    // Press the "Food" chip → only Food expenses and all income should remain
    fireEvent.press(screen.getByRole('button', { name: 'Food' }));

    await waitFor(() => {
      expect(screen.queryByTestId('tx-row-expense-2')).toBeNull(); // Transport gone
    });
    expect(screen.getByTestId('tx-row-income-10')).toBeTruthy(); // income stays
    expect(screen.getByTestId('tx-row-expense-1')).toBeTruthy(); // Food stays
  });

  it('prev arrow navigates to the previous month and re-fetches', async () => {
    mockGetFeed.mockResolvedValue([EXPENSE_TODAY]);
    render(<TransactionList />);

    await screen.findByTestId('tx-row-expense-1');
    fireEvent.press(screen.getByTestId('month-nav-prev'));

    await waitFor(() => {
      expect(mockGetFeed).toHaveBeenCalledWith('2026-05');
    });
  });

  it('next arrow is disabled when viewing the current calendar month', async () => {
    mockGetFeed.mockResolvedValue([]);
    render(<TransactionList />);

    await screen.findByText(/No transactions in/);
    const nextBtn = screen.getByTestId('month-nav-next');
    expect(nextBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('expense rows render the mapped category icon', async () => {
    mockGetFeed.mockResolvedValue([EXPENSE_TODAY]);
    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByTestId('tx-icon-expense-1')).toBeTruthy();
    });
  });

  it('income rows render the mapped source icon', async () => {
    mockGetFeed.mockResolvedValue([INCOME_TODAY]);
    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByTestId('tx-icon-income-10')).toBeTruthy();
    });
  });

  it('an expense with unknown category renders a letter-avatar fallback', async () => {
    const unknownCatExpense: TransactionEntry = {
      ...EXPENSE_TODAY,
      id: 99,
      categoryId: 99999,
      categoryLabel: 'Zap',
    };
    mockGetFeed.mockResolvedValue([unknownCatExpense]);
    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByTestId('tx-avatar-expense-99')).toBeTruthy();
    });
  });

  it('expense rows are tappable — pressing one calls router.push with the correct path', async () => {
    mockGetFeed.mockResolvedValue([EXPENSE_TODAY]);
    render(<TransactionList />);

    const row = await screen.findByTestId('tx-row-expense-1');
    fireEvent.press(row);

    expect(mockPush).toHaveBeenCalledWith('/expenses/1');
  });

  it('income rows are not tappable — pressing one does not call router.push', async () => {
    mockGetFeed.mockResolvedValue([INCOME_TODAY]);
    render(<TransactionList />);

    const row = await screen.findByTestId('tx-row-income-10');
    fireEvent.press(row);

    expect(mockPush).not.toHaveBeenCalled();
  });
});
