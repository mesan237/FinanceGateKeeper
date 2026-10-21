import { DEBT_DUE_SOON_DAYS } from '@/constants/debt';
import { cycleDate } from '@/utils/cycleDate';
import { daysBetween } from '@/utils/formatDate';
import { instalmentAmounts } from '@/utils/instalments';

import type { Debt, DebtPayment, Instalment, LoanCost } from './debt.types';

/**
 * Debt terms (VS-54), pure: equal instalments and what a loan costs. The user
 * types the total to repay rather than a rate, so there is no interest formula
 * here — only the split and an equivalent monthly rate to read the cost by.
 */

export { instalmentAmounts } from '@/utils/instalments';

/**
 * A scheduled debt's instalments: date, amount, the repayment that paid it,
 * and a status against today — `overdue` once its day passed, `due` from
 * `DEBT_DUE_SOON_DAYS` before. Empty without a schedule. Pure.
 */
export function buildInstalments(
  debt: Debt,
  payments: ReadonlyArray<DebtPayment>,
  todayISO: string,
): Instalment[] {
  if (!debt.schedule) return [];
  const { count, frequency, firstDate } = debt.schedule;
  const amounts = instalmentAmounts(debt.repayable, count);
  const paidBy = new Map(payments.filter((p) => p.instalment !== null).map((p) => [p.instalment as number, p]));

  return amounts.map((amount, i) => {
    const n = i + 1;
    const dueDate = cycleDate(firstDate, frequency, n);
    const payment = paidBy.get(n) ?? null;
    const days = daysBetween(todayISO, dueDate);
    const status = payment ? 'paid' : days < 0 ? 'overdue' : days <= DEBT_DUE_SOON_DAYS ? 'due' : 'upcoming';
    return { n, dueDate, amount, status, payment };
  });
}

/** Months since year zero, so a month gap is a subtraction. */
function monthIndex(dateISO: string): number {
  const [year, month] = dateISO.split('-').map(Number);
  return year * 12 + (month - 1);
}

/**
 * What the loan costs on top of the amount, and the equivalent flat monthly
 * rate: `cost ÷ amount ÷ months`, months running from the loan's date to its
 * last instalment (else its due date), at least one. One decimal. Pure.
 */
export function loanCost(debt: Debt): LoanCost {
  const cost = Math.max(0, debt.repayable - debt.amount);
  const end = debt.schedule
    ? cycleDate(debt.schedule.firstDate, debt.schedule.frequency, debt.schedule.count)
    : debt.dueDate;
  if (cost === 0 || !end) return { cost, monthlyRate: null };
  const months = Math.max(1, monthIndex(end) - monthIndex(debt.date));
  return { cost, monthlyRate: Math.round((cost / debt.amount / months) * 1000) / 10 };
}
