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
  getCategoryBudgets: jest.fn(),
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
const mockedNextBudgets = envelopes.getCategoryBudgets as jest.MockedFunction<
  typeof envelopes.getCategoryBudgets
>;

const FOOD = 1;
const TRANSPORT = 5;
const MARKET = 40;
const RESTAURANT = 41;

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

/** Half the month gone: 45,000 spent, heading for 90,000 against a usual 60,000. */
function detail(overrides: Partial<CategoryDetail> = {}): CategoryDetail {
  return {
    categoryId: FOOD,
    categoryName: 'Food',
    subcategory: null,
    month: '2026-08',
    spent: 45_000,
    parts: [
      { subcategoryId: MARKET, name: 'Market', amount: 25_000, count: 4, sharePct: 55.6, usual: 48_000 },
      { subcategoryId: RESTAURANT, name: 'Restaurant', amount: 20_000, count: 6, sharePct: 44.4, usual: 12_000 },
    ],
    repeats: [{ label: 'Bread', count: 6, total: 3_000 }],
    kinds: { fixed: 10_000, variable: 31_000, unexpected: 4_000 },
    average: 60_000,
    reasons: { routine: 10_000, event: 0, unexpected: 4_000, everyday: 31_000 },
    reasonEvents: [],
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
  jest.useFakeTimers({
    now: new Date('2026-08-15T12:00:00.000Z'),
    doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'performance', 'hrtime'],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedDetail.mockResolvedValue(detail());
  mockedOverview.mockResolvedValue(overview());
  mockedNextBudgets.mockResolvedValue([]);
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

describe('CategoryDetailScreen — summary (VS-56)', () => {
  it('reads the month for the category it was opened on', async () => {
    await renderScreen();

    expect(mockedDetail).toHaveBeenCalledWith('2026-08', FOOD);
    expect(screen.getByTestId('screen-header-title')).toHaveTextContent('Food');
    expect(screen.getByTestId(`envelope-row-${FOOD}`)).toBeTruthy();
  });

  it('shows the change against a usual month as a percentage, on the month’s pace', async () => {
    await renderScreen();

    expect(screen.getByTestId('detail-change')).toHaveTextContent('+50%');
    expect(screen.getByTestId('detail-vs-usual')).toHaveTextContent(/on this pace, vs your usual month \(60.000 FCFA\)/);
  });

  it('compares a closed month on what was spent', async () => {
    await renderScreen('2026-07');

    expect(screen.getByTestId('detail-change')).toHaveTextContent('−25%');
    expect(screen.getByTestId('detail-vs-usual')).toHaveTextContent(/^vs your usual month/);
  });

  it('says when there is no usual month yet', async () => {
    mockedDetail.mockResolvedValue(detail({ average: null, parts: [] }));
    await renderScreen();

    expect(screen.getByTestId('detail-no-usual')).toBeTruthy();
    expect(screen.queryByTestId('detail-change')).toBeNull();
  });

  it('says so when nothing was spent and there is no budget', async () => {
    mockedDetail.mockResolvedValue(
      detail({ spent: 0, parts: [], repeats: [], kinds: { fixed: 0, variable: 0, unexpected: 0 } }),
    );
    mockedOverview.mockResolvedValue(overview([]));
    mockedFeed.mockResolvedValue([]);
    await renderScreen();

    expect(screen.getByTestId('detail-nothing-spent')).toBeTruthy();
    expect(screen.queryByTestId('detail-edit-budget')).toBeNull();
    expect(screen.queryByTestId('detail-next')).toBeNull();
  });
});

describe('CategoryDetailScreen — where it went', () => {
  it('gives each subcategory its share and its change against usual', async () => {
    await renderScreen();

    expect(screen.getByTestId(`detail-part-${MARKET}`)).toHaveTextContent(/Market/);
    expect(screen.getByTestId(`detail-part-${MARKET}`)).toHaveTextContent(/56% of it · ×4/);
    // 25,000 halfway through heads for 50,000 against a usual 48,000.
    expect(screen.getByTestId(`detail-part-change-${MARKET}`)).toHaveTextContent('+4%');
    expect(screen.getByTestId(`detail-part-change-${RESTAURANT}`)).toHaveTextContent('+233%');
  });

  it('marks a part with no usual spending as new', async () => {
    mockedDetail.mockResolvedValue(
      detail({ parts: [{ subcategoryId: null, name: null, amount: 45_000, count: 9, sharePct: 100, usual: 0 }] }),
    );
    await renderScreen();

    expect(screen.getByTestId('detail-part-none')).toHaveTextContent(/No subcategory/);
    expect(screen.getByTestId('detail-part-change-none')).toHaveTextContent('New');
  });

  it('names the purchases that keep coming back', async () => {
    await renderScreen();

    expect(screen.getByTestId('detail-repeat-0')).toHaveTextContent(/Bread ×6/);
  });

  it('hides the card when there is neither a split nor a repeat', async () => {
    mockedDetail.mockResolvedValue(detail({ parts: [], repeats: [] }));
    await renderScreen();

    expect(screen.queryByTestId('detail-where')).toBeNull();
  });
});

describe('CategoryDetailScreen — next month', () => {
  it('suggests a budget and the steps to get there', async () => {
    await renderScreen();

    expect(screen.getByTestId('detail-next-target')).toHaveTextContent(/Aim for 60.000 FCFA, your usual month: 33% less/);
    expect(screen.getByTestId('detail-next-fixed')).toHaveTextContent(/10.000 FCFA of it is fixed bills/);
    expect(screen.getByTestId('detail-step-0')).toHaveTextContent(/Bring Restaurant back to usual: save 28.000 FCFA/);
    expect(screen.getByTestId('detail-step-1')).toHaveTextContent(/Skip 1 Bread in 4/);
  });

  it('sets the suggestion as next month’s budget', async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId('detail-use-target'));

    await waitFor(() => expect(mockedSetBudget).toHaveBeenCalledWith('2026-09', FOOD, 60_000, undefined));
  });

  it('shows next month’s budget once it matches the suggestion', async () => {
    mockedNextBudgets.mockResolvedValue([
      { id: 9, month: '2026-09', categoryId: FOOD, allocatedAmount: 60_000, rolloverEnabled: false, createdAt: '' },
    ]);
    await renderScreen();

    expect(screen.getByTestId('detail-next-set')).toHaveTextContent(/Next month’s budget: 60.000 FCFA/);
    expect(screen.queryByTestId('detail-use-target')).toBeNull();
  });

  it('only plans from the month that is running', async () => {
    await renderScreen('2026-07');

    expect(screen.queryByTestId('detail-next')).toBeNull();
  });
});

describe('CategoryDetailScreen — transactions and editing', () => {
  it('lists only this category’s transactions and opens one on tap', async () => {
    await renderScreen();

    expect(screen.getByTestId('tx-row-expense-21')).toBeTruthy();
    expect(screen.queryByTestId('tx-row-expense-22')).toBeNull();
    fireEvent.press(screen.getByTestId('tx-row-expense-21'));

    expect(mockPush).toHaveBeenCalledWith('/expenses/21');
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
      expect(screen.getByText('Le mois prochain')).toBeTruthy();
    } finally {
      await act(async () => {
        await i18n.changeLanguage('en');
      });
    }
  });
});

describe('CategoryDetailScreen — one subcategory (VS-59)', () => {
  const RESTAURANT_ONLY = (): CategoryDetail =>
    detail({
      subcategory: { id: RESTAURANT, name: 'Restaurant' },
      spent: 20_000,
      parts: [],
      repeats: [{ label: 'Lunch', count: 5, total: 12_500 }],
      kinds: { fixed: 0, variable: 20_000, unexpected: 0 },
      average: 12_000,
    });

  it('opens a subcategory from its line in "Where it went"', async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId(`detail-part-${RESTAURANT}`));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/budget/category/[id]',
      params: { id: String(FOOD), month: '2026-08', sub: String(RESTAURANT) },
    });
  });

  it('opens the spending with no subcategory as "none"', async () => {
    mockedDetail.mockResolvedValue(
      detail({ parts: [{ subcategoryId: null, name: null, amount: 45_000, count: 9, sharePct: 100, usual: 0 }] }),
    );
    await renderScreen();

    fireEvent.press(screen.getByTestId('detail-part-none'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/budget/category/[id]',
      params: { id: String(FOOD), month: '2026-08', sub: 'none' },
    });
  });

  it('narrows the screen to that subcategory, on the category’s pace', async () => {
    mockedDetail.mockResolvedValue(RESTAURANT_ONLY());
    mockedFeed.mockResolvedValue([
      { ...ROW, id: 31, subcategoryId: RESTAURANT, subcategoryLabel: 'Restaurant' },
      { ...ROW, id: 32, subcategoryId: MARKET, subcategoryLabel: 'Market' },
    ]);
    render(<CategoryDetailScreen monthISO="2026-08" categoryId={FOOD} subcategory={RESTAURANT} />);
    await screen.findByTestId('category-detail');

    expect(mockedDetail).toHaveBeenCalledWith('2026-08', FOOD, RESTAURANT);
    expect(screen.getByTestId('screen-header-title')).toHaveTextContent('Food › Restaurant');
    expect(screen.getByTestId('detail-sub-spent')).toHaveTextContent(/20.000 FCFA spent/);
    // The category runs at twice its spend so far (90,000 projected on 45,000): 40,000 vs a usual 12,000.
    expect(screen.getByTestId('detail-change')).toHaveTextContent('+233%');
    expect(screen.getByTestId('detail-repeat-0')).toHaveTextContent(/Lunch ×5/);
    expect(screen.getByTestId('tx-row-expense-31')).toBeTruthy();
    expect(screen.queryByTestId('tx-row-expense-32')).toBeNull();
    // Budgets are per category: no envelope, no edit, no next-month plan here.
    expect(screen.queryByTestId('detail-edit-budget')).toBeNull();
    expect(screen.queryByTestId('detail-next')).toBeNull();
  });

  it('names the spending with no subcategory', async () => {
    mockedDetail.mockResolvedValue(detail({ subcategory: { id: null, name: null }, parts: [] }));
    render(<CategoryDetailScreen monthISO="2026-08" categoryId={FOOD} subcategory="none" />);
    await screen.findByTestId('category-detail');

    expect(screen.getByTestId('screen-header-title')).toHaveTextContent('Food › No subcategory');
  });
});

describe('CategoryDetailScreen — why (VS-62)', () => {
  it('shows why the money went and opens an event behind it', async () => {
    mockedDetail.mockResolvedValue(
      detail({
        reasons: { routine: 10_000, event: 15_000, unexpected: 4_000, everyday: 16_000 },
        reasonEvents: [{ eventId: 4, name: 'Marie’s wedding', amount: 15_000, count: 2 }],
      }),
    );
    await renderScreen();

    expect(screen.getByTestId('why-event')).toHaveTextContent(/Events.*15.000 FCFA/);
    fireEvent.press(screen.getByTestId('why-event-4'));

    expect(mockPush).toHaveBeenCalledWith('/events/4');
  });
});
