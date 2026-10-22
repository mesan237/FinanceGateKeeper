import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type {
  BudgetOverview as BudgetOverviewData,
  CategoryBudgetProgress,
  CategoryDetail,
} from '@/features/finance/budget/budget.types';
import type { ExpenseEntry } from '@/types/transactions';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
    useFocusEffect: (cb: () => void) => {
      ReactModule.useEffect(() => cb(), [cb]);
    },
  };
});

jest.mock('@/features/finance/budget/budget.categoryDetail', () => ({
  getCategoryDetail: jest.fn(),
}));
jest.mock('@/features/finance/budget/budget.plan', () => ({
  getBudgetOverview: jest.fn(),
}));
jest.mock('@/features/finance/budget/budget.envelopes', () => ({
  setCategoryBudget: jest.fn(),
  removeCategoryBudget: jest.fn(),
  moveBudget: jest.fn(),
}));
jest.mock('@/services/transactions', () => ({
  getTransactionFeed: jest.fn(),
}));

import { CategoryDetailScreen } from '@/features/finance/budget/CategoryDetailScreen';
import * as detailModule from '@/features/finance/budget/budget.categoryDetail';
import * as envelopes from '@/features/finance/budget/budget.envelopes';
import * as plan from '@/features/finance/budget/budget.plan';
import i18n from '@/i18n';
import * as transactions from '@/services/transactions';

const mockedDetail = detailModule.getCategoryDetail as jest.MockedFunction<
  typeof detailModule.getCategoryDetail
>;
const mockedOverview = plan.getBudgetOverview as jest.MockedFunction<typeof plan.getBudgetOverview>;
const mockedFeed = transactions.getTransactionFeed as jest.MockedFunction<
  typeof transactions.getTransactionFeed
>;
const mockedSetBudget = envelopes.setCategoryBudget as jest.MockedFunction<
  typeof envelopes.setCategoryBudget
>;

const FOOD = 1;
const TRANSPORT = 5;
const MARKET = 40;

function envelope(overrides: Partial<CategoryBudgetProgress> = {}): CategoryBudgetProgress {
  return {
    categoryId: FOOD,
    categoryName: 'Food',
    allocated: 60_000,
    carriedIn: 0,
    available: 60_000,
    spent: 45_000,
    remaining: 15_000,
    consumedPct: 75,
    dailyAverage: 3_000,
    projected: 90_000,
    expectedToDate: 30_000,
    rolloverEnabled: false,
    health: 'at_risk',
    ...overrides,
  };
}

function detail(overrides: Partial<CategoryDetail> = {}): CategoryDetail {
  return {
    categoryId: FOOD,
    categoryName: 'Food',
    month: '2026-08',
    spent: 45_000,
    parts: [
      { subcategoryId: MARKET, name: 'Market', amount: 30_000, count: 4, sharePct: 66.7 },
      { subcategoryId: null, name: null, amount: 15_000, count: 6, sharePct: 33.3 },
    ],
    repeats: [{ label: 'Bread', count: 6, total: 3_000 }],
    largest: [{ id: 11, amount: 12_000, date: '2026-08-03', note: 'Rice sack', subcategoryName: 'Market' }],
    kinds: { fixed: 10_000, variable: 31_000, unexpected: 4_000 },
    average: 60_000,
    ...overrides,
  };
}

function overview(categories: CategoryBudgetProgress[] = [envelope()]): BudgetOverviewData {
  return { month: '2026-08', categories } as unknown as BudgetOverviewData;
}

const ROW: ExpenseEntry = {
  type: 'expense',
  id: 21,
  amount: 2_500,
  date: '2026-08-10',
  categoryId: FOOD,
  categoryLabel: 'Food',
  subcategoryId: null,
  subcategoryLabel: null,
  note: null,
  accountId: null,
  accountLabel: null,
  isUnplanned: false,
  refundOf: null,
};

jest.setTimeout(20_000);

beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-08-15T12:00:00.000Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'performance', 'hrtime'] });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedDetail.mockResolvedValue(detail());
  mockedOverview.mockResolvedValue(overview());
  mockedFeed.mockResolvedValue([
    ROW,
    { ...ROW, id: 22, categoryId: TRANSPORT, categoryLabel: 'Transport' },
    { type: 'income', id: 3, amount: 100_000, date: '2026-08-01', source: 'salary', sourceLabel: 'Salary', note: null, accountId: null, accountLabel: null },
  ]);
  mockedSetBudget.mockResolvedValue();
});

async function renderScreen(monthISO = '2026-08') {
  render(<CategoryDetailScreen monthISO={monthISO} categoryId={FOOD} />);
  await screen.findByTestId('category-detail');
}

describe('CategoryDetailScreen (VS-56)', () => {
  it('reads the month for the category it was opened on', async () => {
    await renderScreen();

    expect(mockedDetail).toHaveBeenCalledWith('2026-08', FOOD);
    expect(screen.getByTestId('screen-header-title')).toHaveTextContent('Food');
    expect(screen.getByTestId(`envelope-row-${FOOD}`)).toBeTruthy();
  });

  it('splits the spending by subcategory with each share', async () => {
    await renderScreen();

    expect(screen.getByTestId(`detail-part-${MARKET}`)).toHaveTextContent(/Market/);
    expect(screen.getByTestId(`detail-part-${MARKET}`)).toHaveTextContent(/67% · ×4/);
    expect(screen.getByTestId('detail-part-none')).toHaveTextContent(/No subcategory/);
  });

  it('hides the split when no expense uses a subcategory', async () => {
    mockedDetail.mockResolvedValue(detail({ parts: [] }));
    await renderScreen();

    expect(screen.queryByTestId('detail-parts')).toBeNull();
  });

  it('names the small purchases that keep coming back', async () => {
    await renderScreen();

    expect(screen.getByTestId('detail-repeat-0')).toHaveTextContent(/Bread ×6/);
  });

  it('opens a big purchase when it is tapped', async () => {
    await renderScreen();

    expect(screen.getByTestId('detail-largest-11')).toHaveTextContent(/Rice sack/);
    fireEvent.press(screen.getByTestId('detail-largest-11'));

    expect(mockPush).toHaveBeenCalledWith('/expenses/11');
  });

  it('separates fixed, variable and unexpected spending', async () => {
    await renderScreen();

    expect(screen.getByTestId('detail-kind-fixed')).toHaveTextContent(/10,000|10 000/);
    expect(screen.getByTestId('detail-kind-variable')).toHaveTextContent(/31,000|31 000/);
    expect(screen.getByTestId('detail-kind-unexpected')).toHaveTextContent(/4,000|4 000/);
  });

  it('compares the current month’s pace with a usual month', async () => {
    await renderScreen();

    expect(screen.getByTestId('detail-usual')).toHaveTextContent(/60,000|60 000/);
    expect(screen.getByTestId('detail-compare')).toHaveTextContent(/On this pace .*, 30.000 FCFA more than usual/);
  });

  it('compares a past month on what was spent', async () => {
    mockedOverview.mockResolvedValue(overview([envelope({ spent: 45_000, projected: 45_000 })]));
    await renderScreen('2026-07');

    expect(screen.getByTestId('detail-compare')).toHaveTextContent(/You spent .*, 15.000 FCFA less than usual/);
  });

  it('says when there is no usual month yet', async () => {
    mockedDetail.mockResolvedValue(detail({ average: null }));
    await renderScreen();

    expect(screen.getByTestId('detail-no-usual')).toBeTruthy();
    expect(screen.queryByTestId('detail-compare')).toBeNull();
  });

  it('lists only this category’s transactions and opens one on tap', async () => {
    await renderScreen();

    expect(screen.getByTestId('tx-row-expense-21')).toBeTruthy();
    expect(screen.queryByTestId('tx-row-expense-22')).toBeNull();
    fireEvent.press(screen.getByTestId('tx-row-expense-21'));

    expect(mockPush).toHaveBeenCalledWith('/expenses/21');
  });

  it('says so when nothing was spent and there is no budget', async () => {
    mockedDetail.mockResolvedValue(
      detail({ spent: 0, parts: [], repeats: [], largest: [], kinds: { fixed: 0, variable: 0, unexpected: 0 } }),
    );
    mockedOverview.mockResolvedValue(overview([]));
    mockedFeed.mockResolvedValue([]);
    await renderScreen();

    expect(screen.getByTestId('detail-nothing-spent')).toBeTruthy();
    expect(screen.queryByTestId('detail-edit-budget')).toBeNull();
  });

  it('edits the envelope from the detail and re-reads the month', async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId('detail-edit-budget'));
    fireEvent.changeText(await screen.findByTestId('envelope-amount'), '75000');
    fireEvent.press(screen.getByTestId('envelope-save'));

    await waitFor(() => expect(mockedSetBudget).toHaveBeenCalledWith('2026-08', FOOD, 75_000, false));
    await waitFor(() => expect(mockedDetail.mock.calls.length).toBeGreaterThan(1));
  });

  it('offers to cover an overspend from another envelope', async () => {
    mockedOverview.mockResolvedValue(
      overview([
        envelope({ spent: 70_000, remaining: -10_000, health: 'over' }),
        envelope({ categoryId: TRANSPORT, categoryName: 'Transport', allocated: 40_000, available: 40_000, spent: 10_000, remaining: 30_000, health: 'on_track' }),
      ]),
    );
    await renderScreen();

    fireEvent.press(screen.getByTestId('detail-edit-budget'));
    fireEvent.press(await screen.findByTestId('envelope-cover'));

    expect(await screen.findByTestId(`envelope-cover-${TRANSPORT}`)).toBeTruthy();
  });

  it('reads in French', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    try {
      await renderScreen();
      expect(screen.getByText('Où est allé l’argent')).toBeTruthy();
      expect(screen.getByTestId('detail-part-none')).toHaveTextContent(/Sans sous-catégorie/);
    } finally {
      await act(async () => {
        await i18n.changeLanguage('en');
      });
    }
  });
});
