import type { Goal, GoalProgress } from './goals.types';

/** Months since year zero for a `YYYY-MM-DD` date, so month gaps are a subtraction. */
function monthIndex(dateISO: string): number {
  const [year, month] = dateISO.split('-').map(Number);
  return year * 12 + (month - 1);
}

/**
 * How many monthly set-asides remain before a sinking fund's date: this month
 * up to, but not including, the target month — money put aside in the month
 * it is needed is usually too late. At least 1 while the date is still ahead
 * (even inside the target month), and 0 once the date has passed. Pure.
 */
export function monthsLeft(targetDateISO: string, todayISO: string): number {
  if (targetDateISO < todayISO) return 0;
  return Math.max(1, monthIndex(targetDateISO) - monthIndex(todayISO));
}

/**
 * A goal's progress from its wallet balance (VS-48). Pure.
 *
 * A sinking fund gets the monthly amount that reaches its target on time and
 * whether the planned amount covers it; once the date passes, everything still
 * missing is due at once. A buffer has no date, so it gets an estimate of how
 * many months its planned amount takes instead.
 *
 * @param balance The linked wallet's live balance; a negative one counts as nothing saved.
 * @param savedThisMonth Net transfers into the wallet this month.
 */
export function goalProgress(
  goal: Goal,
  balance: number,
  savedThisMonth: number,
  todayISO: string,
): GoalProgress {
  const saved = Math.max(0, balance);
  const remaining = Math.max(0, goal.targetAmount - saved);
  const base = {
    saved,
    remaining,
    pct: Math.min(100, Math.round((saved / goal.targetAmount) * 100)),
    achieved: remaining === 0,
    savedThisMonth,
  };

  if (goal.kind === 'buffer' || goal.targetDate === null) {
    return {
      ...base,
      monthsLeft: null,
      requiredMonthly: null,
      onPace: null,
      isOverdue: false,
      monthsToTarget: goal.monthlyAmount > 0 ? Math.ceil(remaining / goal.monthlyAmount) : null,
    };
  }

  const left = monthsLeft(goal.targetDate, todayISO);
  const requiredMonthly = left === 0 ? remaining : Math.ceil(remaining / left);
  return {
    ...base,
    monthsLeft: left,
    requiredMonthly,
    onPace: goal.monthlyAmount >= requiredMonthly,
    isOverdue: left === 0 && remaining > 0,
    monthsToTarget: null,
  };
}
