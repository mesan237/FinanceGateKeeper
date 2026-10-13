/**
 * What an expense edit adds to the budgets it lands in (VS-40).
 *
 * The pre-save budget checks compare a prospective amount against spending
 * that is already in the database. While an expense is being edited, its old
 * amount is still counted in its old month and old category, so the checks
 * must be asked about the difference — but only where the old amount actually
 * sits. Moving the expense to another category or month puts the full amount
 * somewhere it was never counted.
 */

/** The fields of an expense that decide which budgets it counts against. */
export interface BudgetPlacement {
  amount: number;
  categoryId: number | null;
  /** `YYYY-MM-DD`. */
  date: string;
}

/** The amounts to hand the month-wide and category checks for one edit. */
export interface EditBudgetDeltas {
  /** `YYYY-MM` of the edited expense — the month both checks must read. */
  month: string;
  /** What the edit adds to that month's total. Zero or negative needs no check. */
  monthIncrease: number;
  /** What the edit adds to the target category's envelope. Zero or negative needs no check. */
  categoryIncrease: number;
}

/** Returns the `YYYY-MM` month of a `YYYY-MM-DD` date. */
export function monthOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

/**
 * Works out how much an edit adds to the month total and to the target
 * category's envelope, so neither check counts the old amount twice nor
 * misses an amount that moved in from elsewhere.
 */
export function editBudgetDeltas(
  original: BudgetPlacement,
  next: BudgetPlacement,
): EditBudgetDeltas {
  const month = monthOf(next.date);
  const sameMonth = monthOf(original.date) === month;
  const sameCategory = sameMonth && original.categoryId === next.categoryId;
  const difference = next.amount - original.amount;

  return {
    month,
    monthIncrease: sameMonth ? difference : next.amount,
    categoryIncrease: sameCategory ? difference : next.amount,
  };
}
