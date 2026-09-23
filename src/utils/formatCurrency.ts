import { DEFAULT_CURRENCY } from '@/constants/config';

const NBSP = ' ';

/**
 * Formats an FCFA integer amount as a display string with NBSP thousands
 * separators (e.g. 1500 -> "1 500 FCFA"). Non-integer inputs are rounded to
 * the nearest whole FCFA before formatting.
 */
export function formatCurrency(amountInFcfa: number): string {
  const rounded = Math.round(amountInFcfa);
  const isNegative = rounded < 0;
  const digits = Math.abs(rounded).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const sign = isNegative ? '-' : '';
  return `${sign}${grouped}${NBSP}${DEFAULT_CURRENCY}`;
}
