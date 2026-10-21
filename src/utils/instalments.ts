/**
 * Splits `total` into `count` equal whole-FCFA instalments; the last takes the
 * remainder so they add up exactly. Pure. Shared by debt schedules (VS-54) and
 * `budget`'s committed money, so neither imports the other.
 */
export function instalmentAmounts(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? total - base * (count - 1) : base));
}
