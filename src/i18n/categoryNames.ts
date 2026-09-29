import i18n from 'i18next';

import type { categories } from '@/i18n/locales/en/categories';

type CategoryKey = keyof typeof categories;

// Stored English name → catalogue key, for every category migration 001 seeds.
const SEEDED_NAME_KEYS: Readonly<Record<string, CategoryKey>> = {
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
 * @param storedName The category's `name` column.
 */
export function displayCategoryName(storedName: string): string {
  const key = SEEDED_NAME_KEYS[storedName];
  return key ? i18n.t(key, { ns: 'categories' }) : storedName;
}
