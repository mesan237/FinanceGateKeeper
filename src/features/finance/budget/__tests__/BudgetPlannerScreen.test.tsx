import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Category } from '@/features/finance/expenses/expenses.types';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/features/finance/budget/budget.envelopes', () => ({
  getCategoryBudgets: jest.fn(),
  setCategoryBudget: jest.fn(),
  setTotalBudget: jest.fn(),
}));

jest.mock('@/features/finance/budget/budget.baseline', () => ({
  countCompleteMonths: jest.fn().mockResolvedValue(1),
}));

jest.mock('@/features/finance/budget/budget.plan', () => ({
  buildMonthlyPlan: jest.fn(),
  getBudgetableCategories: jest.fn(),
  suggestFromHistory: jest.fn(),
}));

jest.mock('@/features/finance/budget/budget.service', () => ({
  getMonthlyBudget: jest.fn(),
}));

import { BudgetPlannerScreen } from '@/features/finance/budget/BudgetPlannerScreen';
import * as envelopes from '@/features/finance/budget/budget.envelopes';
import * as plan from '@/features/finance/budget/budget.plan';
import * as budgetService from '@/features/finance/budget/budget.service';

const mockedGetBudgets = envelopes.getCategoryBudgets as jest.MockedFunction<
  typeof envelopes.getCategoryBudgets
>;
const mockedSetBudget = envelopes.setCategoryBudget as jest.MockedFunction<
  typeof envelopes.setCategoryBudget
>;
const mockedSetTotal = envelopes.setTotalBudget as jest.MockedFunction<
  typeof envelopes.setTotalBudget
>;
const mockedBuildPlan = plan.buildMonthlyPlan as jest.MockedFunction<typeof plan.buildMonthlyPlan>;
const mockedGetCategories = plan.getBudgetableCategories as jest.MockedFunction<
  typeof plan.getBudgetableCategories
>;
const mockedSuggest = plan.suggestFromHistory as jest.MockedFunction<typeof plan.suggestFromHistory>;
const mockedMonthly = budgetService.getMonthlyBudget as jest.MockedFunction<
  typeof budgetService.getMonthlyBudget
>;

const FOOD = 1;
const TRANSPORT = 5;

function category(id: number, name: string): Category {
  return { id, name, parentId: null, isDefault: true, isHidden: false, costType: null };
}

function setup(
  options: {
    isExplicit?: boolean;
    totalBudget?: number;
    derivedSource?: 'expected' | 'received';
    setAside?: number;
  } = {},
) {
  const { isExplicit = true, totalBudget = 200_000, derivedSource = 'received', setAside = 0 } = options;

  mockedGetCategories.mockResolvedValue([category(FOOD, 'Food'), category(TRANSPORT, 'Transport')]);
  mockedGetBudgets.mockResolvedValue([]);
  mockedSuggest.mockResolvedValue(new Map());
  mockedSetBudget.mockResolvedValue();
  mockedSetTotal.mockResolvedValue();
  mockedMonthly.mockResolvedValue({
    month: '2026-08',
    incomeTotal: 400_000,
    expensesLogged: 0,
    expensesRemaining: 400_000,
  });
  mockedBuildPlan.mockResolvedValue({
    month: '2026-08',
    totalBudget,
    isExplicit,
    derivedTotal: 260_000,
    derivedSource,
    expectedIncome: derivedSource === 'expected' ? 260_000 : null,
    receivedIncome: 260_000,
    unbudgetedIncome: 0,
    surplusNeedsJob: false,
    setAside,
    spendable: totalBudget - setAside,
    setAsideShortfall: 0,
    assigned: 0,
    unassigned: totalBudget - setAside,
    isOverAllocated: false,
  });
}

/** Renders the planner and waits for its initial load to settle. */
async function renderPlanner() {
  render(<BudgetPlannerScreen monthISO="2026-08" />);
  await waitFor(() => expect(screen.queryByTestId('planner-loading')).toBeNull());
}

// The planner renders every category row plus a sticky footer, so each render
// is expensive; under a saturated full-suite run the default 5 s budget is too
// tight (seen as one random test timing out per run). Matches BudgetOverview.
jest.setTimeout(20_000);

beforeEach(() => {
  jest.clearAllMocks();
  setup();
});

describe('BudgetPlannerScreen', () => {
  it('shows a loading state before the plan arrives', async () => {
    render(<BudgetPlannerScreen monthISO="2026-08" />);
    expect(screen.getByTestId('planner-loading')).toBeTruthy();
    // Let the in-flight load settle so its state update stays inside act().
    await waitFor(() => expect(screen.queryByTestId('planner-loading')).toBeNull());
  });

  it('titles itself with the month being planned', async () => {
    await renderPlanner();
    expect(screen.getByText('Plan August 2026')).toBeTruthy();
  });

  it('lists a row per budgetable category', async () => {
    await renderPlanner();
    expect(screen.getByTestId(`planner-category-${FOOD}`)).toBeTruthy();
    expect(screen.getByTestId(`planner-category-${TRANSPORT}`)).toBeTruthy();
  });

  it('starts with the whole total unassigned', async () => {
    await renderPlanner();
    expect(screen.getByTestId('planner-unassigned')).toHaveTextContent('200 000 FCFA');
  });

  it('drives unassigned down as amounts are entered', async () => {
    await renderPlanner();

    fireEvent.changeText(screen.getByTestId(`planner-category-${FOOD}-amount`), '150000');

    await waitFor(() =>
      expect(screen.getByTestId('planner-unassigned')).toHaveTextContent('50 000 FCFA'),
    );
  });

  it('zeroes unassigned when the remainder is dropped into a category', async () => {
    await renderPlanner();

    fireEvent.changeText(screen.getByTestId(`planner-category-${FOOD}-amount`), '150000');
    fireEvent.press(screen.getByTestId(`planner-category-${TRANSPORT}-remainder`));

    await waitFor(() =>
      expect(screen.getByTestId('planner-unassigned')).toHaveTextContent('0 FCFA'),
    );
  });

  it('warns when the categories add up to more than the budget', async () => {
    await renderPlanner();

    fireEvent.changeText(screen.getByTestId(`planner-category-${FOOD}-amount`), '250000');

    await waitFor(() => expect(screen.getByTestId('planner-over-warning')).toBeTruthy());
  });

  it('does not warn while the plan still fits', async () => {
    await renderPlanner();
    expect(screen.queryByTestId('planner-over-warning')).toBeNull();
  });

  it("explains that the total follows this month's income when none is set (VS-40)", async () => {
    setup({ isExplicit: false, totalBudget: 260_000 });
    await renderPlanner();

    // There is no income split since VS-34 — the copy must not promise one.
    expect(screen.getByTestId('planner-total-hint')).toHaveTextContent(
      "Following this month's income — 260 000 FCFA.",
    );
  });

  it("offers the month's-income shortcut only once a manual total is set", async () => {
    setup({ isExplicit: false, totalBudget: 260_000 });
    await renderPlanner();
    expect(screen.queryByTestId('planner-use-derived')).toBeNull();

    fireEvent.changeText(screen.getByTestId('planner-total'), '300000');

    await waitFor(() => expect(screen.getByTestId('planner-use-derived')).toBeTruthy());
    expect(screen.getByText("Use this month's income")).toBeTruthy();
  });

  it('follows expected income when the user gave an estimate (VS-47)', async () => {
    setup({ isExplicit: false, totalBudget: 260_000, derivedSource: 'expected' });
    await renderPlanner();

    expect(screen.getByTestId('planner-total-hint')).toHaveTextContent(
      'Following your expected income — 260 000 FCFA.',
    );

    fireEvent.changeText(screen.getByTestId('planner-total'), '300000');
    await waitFor(() => expect(screen.getByText('Use expected income')).toBeTruthy());
  });

  it('sets the goals aside before sharing out the rest (VS-49)', async () => {
    setup({ setAside: 30_000 });
    await renderPlanner();

    expect(screen.getByTestId('planner-set-aside')).toHaveTextContent(
      '30 000 FCFA goes to your goals first. The rest is shared out below.',
    );
    expect(screen.getByTestId('planner-unassigned')).toHaveTextContent('170 000 FCFA');

    fireEvent.changeText(screen.getByTestId(`planner-category-${FOOD}-amount`), '180000');

    await waitFor(() => expect(screen.getByTestId('planner-over-warning')).toBeTruthy());
  });

  it('drops only what is left after the goals into a category', async () => {
    setup({ setAside: 30_000 });
    await renderPlanner();

    fireEvent.press(screen.getByTestId(`planner-category-${FOOD}-remainder`));

    await waitFor(() =>
      expect(screen.getByTestId(`planner-category-${FOOD}-amount`).props.value).toBe('170 000'),
    );
  });

  it('says nothing about goals when none set money aside', async () => {
    await renderPlanner();

    expect(screen.queryByTestId('planner-set-aside')).toBeNull();
  });

  it('offers the averages shortcut only when there is history to average', async () => {
    await renderPlanner();
    expect(screen.queryByTestId('planner-apply-suggestions')).toBeNull();

    mockedSuggest.mockResolvedValue(new Map([[FOOD, 55_000]]));
    await renderPlanner();

    expect(screen.getByTestId('planner-apply-suggestions')).toBeTruthy();
  });

  it('fills the draft from history when averages are applied', async () => {
    mockedSuggest.mockResolvedValue(new Map([[FOOD, 55_000]]));
    await renderPlanner();

    fireEvent.press(screen.getByTestId('planner-apply-suggestions'));

    await waitFor(() =>
      expect(screen.getByTestId(`planner-category-${FOOD}-amount`).props.value).toBe('55 000'),
    );
  });

  it('saves the total and every envelope, then returns', async () => {
    await renderPlanner();

    fireEvent.changeText(screen.getByTestId(`planner-category-${FOOD}-amount`), '60000');
    fireEvent.press(screen.getByTestId('planner-save'));

    await waitFor(() => expect(mockedSetTotal).toHaveBeenCalledWith('2026-08', 200_000));
    expect(mockedSetBudget).toHaveBeenCalledWith('2026-08', FOOD, 60_000, false);
    expect(mockBack).toHaveBeenCalled();
  });

  it('persists a rollover toggle with its envelope', async () => {
    await renderPlanner();

    fireEvent.changeText(screen.getByTestId(`planner-category-${FOOD}-amount`), '60000');
    fireEvent.press(screen.getByTestId(`planner-category-${FOOD}-rollover`));
    fireEvent.press(screen.getByTestId('planner-save'));

    await waitFor(() =>
      expect(mockedSetBudget).toHaveBeenCalledWith('2026-08', FOOD, 60_000, true),
    );
  });

  it('stays open and surfaces the reason when saving fails', async () => {
    mockedSetTotal.mockRejectedValue(new Error('disk full'));
    await renderPlanner();

    fireEvent.press(screen.getByTestId('planner-save'));

    await waitFor(() => expect(screen.getByTestId('planner-error')).toHaveTextContent('disk full'));
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('says how much history the averages rest on (VS-46)', async () => {
    mockedSuggest.mockResolvedValue(new Map([[FOOD, 55_000]]));
    await renderPlanner();

    expect(screen.getByTestId('planner-apply-suggestions')).toHaveTextContent(
      'Use my averages · provisional, 1 month',
    );
  });
});
