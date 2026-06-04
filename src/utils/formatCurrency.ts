/**
 * Formats a whole-number FCFA amount for display, using space-separated
 * thousands (the West/Central African, FR-style convention). FCFA has no
 * decimals, so any fractional part is truncated toward zero.
 *
 * @param value Whole-number amount in FCFA. May be negative.
 * @returns e.g. `1500` -> "1 500 FCFA", `-2000` -> "-2 000 FCFA", `0` -> "0 FCFA".
 */
export function formatCurrency(value: number): string {
  const whole = Math.trunc(value);
  const negative = whole < 0;
  const grouped = Math.abs(whole)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${negative ? '-' : ''}${grouped} FCFA`;
}
