/**
 * Whole-percent change from `reference` to `now`; null when there is no
 * reference figure or it is zero (a percentage against nothing means nothing).
 */
export function percentChange(now: number, reference: number | null): number | null {
  if (reference === null || reference <= 0) return null;
  return Math.round(((now - reference) / reference) * 100);
}
