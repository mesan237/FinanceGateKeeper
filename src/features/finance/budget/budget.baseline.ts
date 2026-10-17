import i18n from 'i18next';

import { getMonthCoverage } from '@/features/finance/expenses/expenses.coverage';
import { execute, query } from '@/services/database';
import { prevMonthISO } from '@/utils/monthMath';

import type {
  Baseline,
  BaselineFact,
  BaselineKind,
  BaselineStep,
  Estimates,
  FactSource,
} from './budget.types';

/**
 * The baseline (VS-46): what the user tells the app before it has enough
 * logged months to know — typical income, whether it is regular, pay day and
 * monthly essentials — and the checklist that walks them through setting up
 * the rest (balances, bills, debts, fixed categories) with screens that
 * already exist.
 *
 * Facts are append-only in \`baseline_facts\`; the latest row per kind wins, so
 * earlier estimates are kept and each one records whether the user typed it or
 * accepted it from observed months. The checklist reads other slices' tables
 * by SQL rather than importing them, so \`budget\` gains no new dependency.
 */

const KINDS: ReadonlySet<BaselineKind> = new Set<BaselineKind>([
  'monthly_income',
  'income_regular',
  'pay_day',
  'monthly_essentials',
  'no_debts',
  'cost_types_reviewed',
  'checklist_hidden',
]);

/** A validation error in the active UI language. */
function err(key: 'estimateAmount' | 'payDay'): Error {
  return new Error(i18n.t(`errors.${key}`, { ns: 'budget' }));
}

/**
 * Appends one baseline fact. Values are whole numbers: amounts in FCFA, flags
 * as 1/0, pay day as 1–31.
 *
 * @throws on an unknown kind or a value outside its range.
 */
export async function setBaselineFact(
  kind: BaselineKind,
  value: number,
  source: FactSource = 'user',
): Promise<void> {
  if (!KINDS.has(kind) || !Number.isInteger(value) || value < 0) throw err('estimateAmount');
  if (kind === 'pay_day' && (value < 1 || value > 31)) throw err('payDay');
  await execute(
    'INSERT INTO baseline_facts (kind, value, source, created_at) VALUES (?, ?, ?, ?)',
    [kind, value, source, new Date().toISOString()],
  );
}

/** The latest fact per kind. */
async function latestFacts(): Promise<Map<BaselineKind, BaselineFact>> {
  const rows = await query<{ kind: BaselineKind; value: number; source: FactSource; created_at: string }>(
    `SELECT kind, value, source, created_at FROM baseline_facts f
     WHERE created_at = (SELECT MAX(created_at) FROM baseline_facts g WHERE g.kind = f.kind)
     ORDER BY id`,
  );
  return new Map(rows.map((r) => [r.kind, { value: r.value, source: r.source, setAt: r.created_at }]));
}

/** Everything the user has told the app so far; unanswered questions are null. */
export async function getBaseline(): Promise<Baseline> {
  const facts = await latestFacts();
  const flag = (kind: BaselineKind) => facts.get(kind)?.value === 1;
  const regular = facts.get('income_regular');
  const payDay = facts.get('pay_day');
  return {
    monthlyIncome: facts.get('monthly_income') ?? null,
    incomeRegular: regular ? regular.value === 1 : null,
    // A pay day only means something for regular income.
    payDay: regular?.value === 1 && payDay && payDay.value > 0 ? payDay.value : null,
    monthlyEssentials: facts.get('monthly_essentials') ?? null,
    noDebts: flag('no_debts'),
    costTypesReviewed: flag('cost_types_reviewed'),
    checklistHidden: flag('checklist_hidden'),
  };
}

/**
 * Saves the estimates form. Only answers that changed are written, so saving
 * the same form twice leaves one row per answer.
 *
 * @throws if an amount is not a whole, non-negative FCFA figure or the pay day
 *   is outside 1–31.
 */
export async function saveEstimates(estimates: Estimates): Promise<void> {
  const amountOk = (v: number) => Number.isInteger(v) && v >= 0;
  if (!amountOk(estimates.monthlyIncome) || !amountOk(estimates.monthlyEssentials)) {
    throw err('estimateAmount');
  }
  const payDay = estimates.incomeRegular ? estimates.payDay : null;
  if (payDay !== null && (!Number.isInteger(payDay) || payDay < 1 || payDay > 31)) throw err('payDay');

  const current = await latestFacts();
  const answers: [BaselineKind, number][] = [
    ['monthly_income', estimates.monthlyIncome],
    ['income_regular', estimates.incomeRegular ? 1 : 0],
    ['pay_day', payDay ?? 0],
    ['monthly_essentials', estimates.monthlyEssentials],
  ];
  for (const [kind, value] of answers) {
    // An irregular income with no pay day on record has nothing to clear.
    if (kind === 'pay_day' && value === 0 && !current.has('pay_day')) continue;
    if (current.get(kind)?.value === value) continue;
    await execute(
      'INSERT INTO baseline_facts (kind, value, source, created_at) VALUES (?, ?, ?, ?)',
      [kind, value, 'user', new Date().toISOString()],
    );
  }
}

/**
 * The setup checklist, in order. Each step is done because of what the user
 * actually set up — a confirmed balance, a recurring bill, a recorded debt —
 * or because they said so ("I have no debts", "my fixed categories look right").
 */
export async function getBaselineChecklist(): Promise<BaselineStep[]> {
  const [baseline, [counts]] = await Promise.all([
    getBaseline(),
    query<{ checks: number; bills: number; debts: number }>(
      `SELECT
         (SELECT COUNT(*) FROM balance_checks WHERE deleted_at IS NULL) AS checks,
         (SELECT COUNT(*) FROM recurring_expenses) AS bills,
         (SELECT COUNT(*) FROM debts WHERE deleted_at IS NULL) AS debts`,
    ),
  ]);
  return [
    { key: 'balances', done: counts.checks > 0 },
    { key: 'bills', done: counts.bills > 0 },
    { key: 'debts', done: counts.debts > 0 || baseline.noDebts },
    { key: 'costTypes', done: baseline.costTypesReviewed },
    { key: 'estimates', done: baseline.monthlyIncome !== null && baseline.monthlyEssentials !== null },
  ];
}

/**
 * How many of the `lookback` months before `monthISO` are complete — the
 * evidence behind any average the app shows. Fewer than three reads as
 * provisional.
 */
export async function countCompleteMonths(monthISO: string, lookback: number = 3): Promise<number> {
  const months: string[] = [];
  let cursor = monthISO;
  for (let i = 0; i < lookback; i += 1) {
    cursor = prevMonthISO(cursor);
    months.push(cursor);
  }
  const coverage = await Promise.all(months.map(getMonthCoverage));
  return coverage.filter((c) => c.isComplete).length;
}
