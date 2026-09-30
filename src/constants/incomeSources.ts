import i18n from 'i18next';

/**
 * The closed set of income source tags. Unlike expense categories (a user-
 * editable tree in the `categories` table), income sources are a fixed enum set
 * in the PRD — there is no UI to add custom sources — so they live here as a
 * constant rather than in the database.
 *
 * This is the single source of truth: `IncomeSource` is derived from the tuple
 * (below) and the `income` migration's CHECK constraint mirrors these values.
 * Defined in `constants/` (not the feature) because the dependency rules forbid
 * `constants/` from importing `features/`, while features may import constants.
 */
export const INCOME_SOURCES = [
  { value: 'salary' },
  { value: 'freelance' },
  { value: 'ecommerce' },
] as const;

/** A valid income source tag — one of the `INCOME_SOURCES` values. */
export type IncomeSource = (typeof INCOME_SOURCES)[number]['value'];

/** The set of valid source values, for O(1) runtime validation. */
export const INCOME_SOURCE_VALUES: ReadonlySet<string> = new Set(
  INCOME_SOURCES.map((s) => s.value),
);

/** Narrows an arbitrary string (e.g. a DB column) to a known source tag. */
export function isIncomeSource(value: string): value is IncomeSource {
  return INCOME_SOURCE_VALUES.has(value);
}

/**
 * Returns the display label for a source value in the active UI language
 * (e.g. `"salary"` -> "Salary" / "Salaire"). An unknown value is returned as-is.
 */
export function labelForSource(source: string): string {
  return isIncomeSource(source) ? i18n.t(`incomeSources.${source}`) : source;
}
