import i18n from 'i18next';

import type { DebtSchedule } from './debt.types';

/** True for a real `YYYY-MM-DD` calendar date. */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Validates a debt's terms (VS-54): a total to repay, when given, is a whole
 * amount of at least what was borrowed; a schedule has 2–120 instalments,
 * weekly or monthly, from a real date.
 *
 * @throws a localised error naming what is wrong.
 */
export function assertTerms(amount: number, totalToRepay: number | null, schedule: DebtSchedule | null): void {
  if (totalToRepay !== null && (!Number.isInteger(totalToRepay) || totalToRepay < amount)) {
    throw new Error(i18n.t('errors.totalBelowAmount', { ns: 'debt' }));
  }
  if (schedule === null) return;
  const { count, frequency, firstDate } = schedule;
  if (!Number.isInteger(count) || count < 2 || count > 120 || !['weekly', 'monthly'].includes(frequency) || !isValidDate(firstDate)) {
    throw new Error(i18n.t('errors.scheduleInvalid', { ns: 'debt' }));
  }
}
