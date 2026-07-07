import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
// Captured `useFocusEffect` callbacks. The mock does not auto-run them (the
// mount refresh comes from `useTransactions`); a test fires the latest to
// simulate the tab regaining focus after returning from the detail screen.
const mockFocusCallbacks: Array<() => void> = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    mockFocusCallbacks.push(cb);
  },
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
  accountId: null,
  accountLabel: null,
};

const INCOME_TODAY: TransactionEntry = {
  type: 'income',
  id: 10,
  amount: 50000,
  date: TODAY,
  source: 'salary',
  sourceLabel: 'Salary',
  note: null,
  accountId: null,
  accountLabel: null,
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
  accountId: null,
  accountLabel: null,
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
  accountId: null,
  accountLabel: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetFeed.mockResolvedValue([]);
  mockPush.mockReset();
  mockFocusCallbacks.length = 0;
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

  it('section header shows the signed day net (income surplus as +)', async () => {
    mockGetFeed.mockResolvedValue([EXPENSE_TODAY, INCOME_TODAY]);
    render(<TransactionList />);

    // Income 50 000 − expense 2 000 = 48 000 net in, shown with a + sign.
    await waitFor(() => {
      expect(screen.getByTestId('section-net-2026-06-10')).toBeTruthy();
    });
    expect(screen.getByTestId('section-net-2026-06-10').props.children).toBe('+48 000 FCFA');
  });

  it('section header shows a net-spend day with a − sign', async () => {
    mockGetFeed.mockResolvedValue([EXPENSE_TODAY]);
    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByTestId('section-net-2026-06-10')).toBeTruthy();
    });
    expect(screen.getByTestId('section-net-2026-06-10').props.children).toBe('−2 000 FCFA');
  });

  it('renders income rows by testID', async () => {
    mockGetFeed.mockResolvedValue([INCOME_TODAY]);
    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByTestId('tx-row-income-10')).toBeTruthy();
    });
  });

  it('renders expense rows by testID', async () => {
    mockGetFeed.mockResolvedValue([EXPENSE_TODAY]);
    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByTestId('tx-row-expense-1')).toBeTruthy();
    });
  });

  it('income rows are tappable — pressing one navigates to the income detail (VS-20)', async () => {
    mockGetFeed.mockResolvedValue([INCOME_TODAY]);
    render(<TransactionList />);

    const row = await screen.findByTestId('tx-row-income-10');
    fireEvent.press(row);

    expect(mockPush).toHaveBeenCalledWith('/income/10');
  });

  it('renders empty state when feed is empty', async () => {
    mockGetFeed.mockResolvedValue([]);
    render(<TransactionList />);

    expect(await screen.findByText(/No transactions in/)).toBeTruthy();
  });

  it('shows a spinner on first load and keeps rows visible while a refetch is in flight', async () => {
    mockGetFeed.mockResolvedValueOnce([EXPENSE_TODAY]);
    render(<TransactionList />);

    // Cold load: spinner, never a premature "No transactions" flash.
    expect(screen.getByTestId('feed-loading')).toBeTruthy();
    expect(screen.queryByText(/No transactions in/)).toBeNull();

    await screen.findByTestId('tx-row-expense-1');

    // Navigate to a month whose query stays in flight — the previous rows
    // must stay rendered instead of blanking out.
    let resolveNext!: (entries: TransactionEntry[]) => void;
    mockGetFeed.mockImplementationOnce(
      () =>
        new Promise<TransactionEntry[]>((resolve) => {
          resolveNext = resolve;
        }),
    );
    fireEvent.press(screen.getByTestId('month-nav-prev'));

    expect(screen.getByTestId('tx-row-expense-1')).toBeTruthy();

    await act(async () => {
      resolveNext([]);
    });
    expect(await screen.findByText(/No transactions in/)).toBeTruthy();
  });

  it('shows the load error with a Retry action that re-fetches', async () => {
    mockGetFeed.mockRejectedValueOnce(new Error('Feed failed'));
    mockGetFeed.mockResolvedValueOnce([EXPENSE_TODAY]);
    render(<TransactionList />);

    expect(await screen.findByText('Feed failed')).toBeTruthy();
    expect(screen.queryByText(/No transactions in/)).toBeNull();

    fireEvent.press(screen.getByTestId('feed-retry'));

    expect(await screen.findByTestId('tx-row-expense-1')).toBeTruthy();
    expect(screen.queryByText('Feed failed')).toBeNull();
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

  it('income rows push the income route, not the expense route', async () => {
    mockGetFeed.mockResolvedValue([INCOME_TODAY]);
    render(<TransactionList />);

    const row = await screen.findByTestId('tx-row-income-10');
    fireEvent.press(row);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/expenses/'));
  });

  it('transfer rows render with a from→to label', async () => {
    const transfer: TransactionEntry = {
      type: 'transfer',
      id: 7,
      amount: 3000,
      date: TODAY,
      fromAccountName: 'Cash',
      toAccountName: 'MTN MoMo',
    };
    mockGetFeed.mockResolvedValue([transfer]);
    render(<TransactionList />);

    await waitFor(() => expect(screen.getByTestId('tx-row-transfer-7')).toBeTruthy());
    expect(screen.getByText('Cash → MTN MoMo')).toBeTruthy();
  });

  it('re-fetches when the tab regains focus, so an edit/delete on the detail screen shows up', async () => {
    mockGetFeed.mockResolvedValue([EXPENSE_TODAY]);
    render(<TransactionList />);
    await screen.findByTestId('tx-row-expense-1');

    // Simulate the expense detail screen deleting the row, then router.back()
    // returning focus to this list (no reloadToken bump involved).
    mockGetFeed.mockResolvedValue([]);
    await act(async () => {
      mockFocusCallbacks[mockFocusCallbacks.length - 1]();
    });

    expect(await screen.findByText(/No transactions in/)).toBeTruthy();
  });

  it('expense rows with a non-null account_id render an account chip; legacy rows do not', async () => {
    const withAccount: TransactionEntry = {
      ...EXPENSE_TODAY,
      id: 20,
      accountId: 1,
      accountLabel: 'Cash',
    };
    mockGetFeed.mockResolvedValue([withAccount, EXPENSE_YESTERDAY]);
    render(<TransactionList />);

    await waitFor(() => expect(screen.getByTestId('tx-account-chip-expense-20')).toBeTruthy());
    // EXPENSE_YESTERDAY has a null account → no chip
    expect(screen.queryByTestId('tx-account-chip-expense-2')).toBeNull();
  });
});
