import i18n from 'i18next';

import type { categories } from '@/i18n/locales/en/categories';

type CategoryKey = keyof typeof categories;

/** Stored English name → catalogue key, for every category migration 001 seeds. */
export const SEEDED_NAME_KEYS: Readonly<Record<string, CategoryKey>> = {
  Food: 'food',
  Groceries: 'groceries',
  Restaurant: 'restaurant',
  Snacks: 'snacks',
  Transport: 'transport',
  Taxi: 'taxi',
  Fuel: 'fuel',
  'Public Transport': 'publicTransport',
  Bills: 'bills',
  Rent: 'rent',
  Electricity: 'electricity',
  Water: 'water',
  Internet: 'internet',
  Phone: 'phone',
  Health: 'health',
  Pharmacy: 'pharmacy',
  Doctor: 'doctor',
  Entertainment: 'entertainment',
  Streaming: 'streaming',
  Outings: 'outings',
  Education: 'education',
  Books: 'books',
  Courses: 'courses',
  Shopping: 'shopping',
  Clothing: 'clothing',
  Household: 'household',
  Other: 'other',
  Miscellaneous: 'miscellaneous',
};

/**
 * Returns the name to show for a category. The seeded defaults are stored in
 * English, so they are translated into the active language; any name the user
 * typed (or renamed a default to) is shown exactly as stored.
 *
 * Pass `isDefault` whenever the row is at hand: a user's own category that
 * happens to share a seeded name ("Courses", "Shopping") must not be
 * translated. Callers holding only a label string fall back to name matching.
 *
 * @param storedName The category's `name` column.
 * @param isDefault The row's `is_default` flag; `true` when unknown.
 */
export function displayCategoryName(storedName: string, isDefault = true): string {
  const key = isDefault ? SEEDED_NAME_KEYS[storedName] : undefined;
  return key ? i18n.t(key, { ns: 'categories' }) : storedName;
}
