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
  return { id, name, parentId: null, isDefault: true, isHidden: false };
}

function setup(options: { isExplicit?: boolean; totalBudget?: number } = {}) {
  const { isExplicit = true, totalBudget = 200_000 } = options;

  mockedGetCategories.mockResolvedValue([category(FOOD, 'Food'), category(TRANSPORT, 'Transport')]);
  mockedGetBudgets.mockResolvedValue([]);
  mockedSuggest.mockResolvedValue(new Map());
  mockedSetBudget.mockResolvedValue();
  mockedSetTotal.mockResolvedValue();
  mockedMonthly.mockResolvedValue({
    month: '2026-08',
    incomeTotal: 400_000,
    allocation: {} as never,
    breakdown: { emergencyFund: 40_000, savings: 40_000, projects: 60_000, expenses: 260_000 },
    expensesLogged: 0,
    expensesRemaining: 260_000,
  });
  mockedBuildPlan.mockResolvedValue({
    month: '2026-08',
    totalBudget,
    isExplicit,
    derivedTotal: 260_000,
    assigned: 0,
    unassigned: totalBudget,
    isOverAllocated: false,
  });
}

/** Renders the planner and waits for its initial load to settle. */
async function renderPlanner() {
  render(<BudgetPlannerScreen monthISO="2026-08" />);
  await waitFor(() => expect(screen.queryByTestId('planner-loading')).toBeNull());
}

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

  it('explains that the total follows the income split when none is set', async () => {
    setup({ isExplicit: false, totalBudget: 260_000 });
    await renderPlanner();

    expect(screen.getByTestId('planner-total-hint')).toHaveTextContent(
      'Following your income split — 260 000 FCFA.',
    );
  });

  it('offers the income-split shortcut only once a manual total is set', async () => {
    setup({ isExplicit: false, totalBudget: 260_000 });
    await renderPlanner();
    expect(screen.queryByTestId('planner-use-derived')).toBeNull();

    fireEvent.changeText(screen.getByTestId('planner-total'), '300000');

    await waitFor(() => expect(screen.getByTestId('planner-use-derived')).toBeTruthy());
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
});
