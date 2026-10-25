import { fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { BudgetHeroCard } from '@/features/finance/budget/BudgetHeroCard';
import type { BudgetOverview, MonthlyPlan } from '@/features/finance/budget/budget.types';
import i18n from '@/i18n';
import { LIGHT_COLORS } from '@/theme/palettes';

const PLAN: MonthlyPlan = {
  month: '2026-08',
  totalBudget: 300_000,
  isExplicit: true,
  derivedTotal: 260_000,
  derivedSource: 'received',
  expectedIncome: null,
  receivedIncome: 260_000,
  unbudgetedIncome: 0,
  surplusNeedsJob: false,
  setAside: 0,
  spendable: 300_000,
  setAsideShortfall: 0,
  assigned: 300_000,
  unassigned: 0,
  isOverAllocated: false,
};

function overview(overrides: Partial<BudgetOverview> = {}, plan: Partial<MonthlyPlan> = {}): BudgetOverview {
  return {
    month: '2026-08',
    plan: { ...PLAN, ...plan },
    categories: [],
    totalCarried: 0,
    available: 300_000,
    spent: 100_000,
    remaining: 200_000,
    consumedPct: 33,
    dailyAverage: 10_000,
    projected: 280_000,
    expectedToDate: 100_000,
    safeDailySpend: 9_523.4,
    daysElapsed: 10,
    daysRemaining: 21,
    health: 'on_track',
    isUnplanned: false,
    ...overrides,
  };
}

describe('BudgetHeroCard (UX-13)', () => {
  it('keeps the first block to what is left, what is spent and a day to stay on plan', () => {
    render(<BudgetHeroCard overview={overview()} />);

    expect(screen.getByTestId('budget-remaining')).toHaveTextContent('200 000 FCFA');
    expect(screen.getByText('100 000 FCFA of 300 000 FCFA spent')).toBeTruthy();
    // The same words and rounding as Home's Today card (UX-11).
    expect(screen.getByTestId('budget-per-day')).toHaveTextContent('A day to stay on plan: 9 523 FCFA');
  });

  it('keeps the figure in plain text when over plan: the label and chip carry it (UX-15)', () => {
    render(<BudgetHeroCard overview={overview({ remaining: -15_000, spent: 315_000, health: 'over' })} />);

    const style = StyleSheet.flatten(screen.getByTestId('budget-remaining').props.style);
    expect(style.color).toBe(LIGHT_COLORS.TEXT_PRIMARY);
    expect(screen.getByText('Over your plan by')).toBeTruthy();
  });

  it('drops the stat row and the percentage', () => {
    render(<BudgetHeroCard overview={overview()} />);

    expect(screen.queryByTestId('budget-stat-days')).toBeNull();
    expect(screen.queryByTestId('budget-stat-projected')).toBeNull();
    expect(screen.queryByText('33%')).toBeNull();
  });

  it('says where the month is heading only when that is past the plan', () => {
    render(<BudgetHeroCard overview={overview({ projected: 310_000, health: 'at_risk' })} />);
    expect(screen.getByTestId('budget-heading-for')).toHaveTextContent(
      'Heading for ≈ 310 000 FCFA by month end',
    );
  });

  it('stays quiet about the projection while it fits the plan', () => {
    render(<BudgetHeroCard overview={overview()} />);
    expect(screen.queryByTestId('budget-heading-for')).toBeNull();
  });

  it('keeps the expected-income line in the hero while less has come in than expected', () => {
    render(
      <BudgetHeroCard
        overview={overview({}, { isExplicit: false, derivedSource: 'expected', expectedIncome: 250_000, receivedIncome: 150_000 })}
      />,
    );
    expect(screen.getByTestId('budget-expected-income')).toHaveTextContent(
      'Planned on expected income · 150 000 FCFA of 250 000 FCFA received',
    );
  });

  it('moves the expected-income line out of the hero once it has all come in', () => {
    render(
      <BudgetHeroCard
        overview={overview({}, { isExplicit: false, derivedSource: 'expected', expectedIncome: 250_000, receivedIncome: 290_000 })}
      />,
    );
    expect(screen.queryByTestId('budget-expected-income')).toBeNull();
  });

  it('keeps set-aside and carried-over notes out of the hero', () => {
    render(<BudgetHeroCard overview={overview({ totalCarried: 12_000 }, { setAside: 30_000 })} />);

    expect(screen.queryByTestId('budget-set-aside')).toBeNull();
    expect(screen.queryByTestId('budget-carried')).toBeNull();
  });

  it('shows how the plan is built as a sum the user can check', () => {
    render(
      <BudgetHeroCard
        overview={overview({ totalCarried: 12_000, available: 282_000 }, { setAside: 30_000, spendable: 270_000 })}
      />,
    );

    fireEvent.press(screen.getByTestId('budget-how-built'));

    const sheet = within(screen.getByTestId('plan-build-sheet'));
    expect(sheet.getByTestId('plan-build-total-source')).toHaveTextContent('The total you set');
    expect(sheet.getByTestId('plan-build-total')).toHaveTextContent('300 000 FCFA');
    expect(sheet.getByTestId('plan-build-set-aside')).toHaveTextContent('−30 000 FCFA');
    expect(sheet.getByTestId('plan-build-carried')).toHaveTextContent('+12 000 FCFA');
    expect(sheet.getByTestId('plan-build-result')).toHaveTextContent('282 000 FCFA');
  });

  it('names an expected-income plan, and what has come in, in the sheet', () => {
    render(
      <BudgetHeroCard
        overview={overview({}, { isExplicit: false, derivedSource: 'expected', expectedIncome: 250_000, receivedIncome: 290_000, totalBudget: 250_000 })}
      />,
    );

    fireEvent.press(screen.getByTestId('budget-how-built'));

    const sheet = within(screen.getByTestId('plan-build-sheet'));
    expect(sheet.getByTestId('plan-build-total-source')).toHaveTextContent('Your expected income');
    expect(sheet.getByText('Planned on expected income · 290 000 FCFA of 250 000 FCFA received')).toBeTruthy();
    expect(sheet.queryByTestId('plan-build-set-aside')).toBeNull();
  });

  it('reads in French', async () => {
    await i18n.changeLanguage('fr');
    render(<BudgetHeroCard overview={overview({ projected: 310_000 })} />);

    expect(screen.getByTestId('budget-per-day')).toHaveTextContent('Par jour pour tenir le budget : 9 523 FCFA');
    expect(screen.getByTestId('budget-heading-for')).toHaveTextContent('En route vers ≈ 310 000 FCFA en fin de mois');
    expect(screen.getByText('Comment ce budget est construit')).toBeTruthy();
  });
});
