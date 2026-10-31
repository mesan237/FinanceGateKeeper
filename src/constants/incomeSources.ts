import i18n from 'i18next';

/**
 * The keys of the built-in income sources (VS-91). Sources are rows in the
 * `income_sources` table — the user adds their own, one level deep — and a
 * built-in row carries one of these keys so it is shown in the active language
 * and gets its icon. E-commerce is a subsource of Business. Migration 051 seeds
 * one row per key; a source the user made has no key.
 */
export const INCOME_SOURCE_KEYS = ['salary', 'freelance', 'business', 'gift', 'other', 'ecommerce'] as const;

/** The key of a built-in income source. */
export type IncomeSourceKey = (typeof INCOME_SOURCE_KEYS)[number];

const KEYS: ReadonlySet<string> = new Set(INCOME_SOURCE_KEYS);

/** Narrows an arbitrary string (e.g. a DB column) to a built-in source key. */
export function isIncomeSourceKey(value: string): value is IncomeSourceKey {
  return KEYS.has(value);
}

/**
 * Returns the display label of an income source in the active UI language: a
 * built-in by its `key` (e.g. `"salary"` -> "Salary" / "Salaire"), a source the
 * user made by its own `name`.
 */
export function labelForIncomeSource(key: string | null, name: string): string {
  return key !== null && isIncomeSourceKey(key) ? i18n.t(`incomeSources.${key}`) : name;
}
