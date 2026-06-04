/**
 * A seed category with its child subcategory names. Seeded into the
 * `categories` table by migration 001. Order in this array determines each
 * row's `sort_order`.
 */
export interface DefaultCategory {
  name: string;
  subcategories: string[];
}

/**
 * The default category tree seeded on first launch. Parents and their
 * subcategories both live in the `categories` table (subcategories carry a
 * non-null `parent_id`). The user can add more via category management (VS-04).
 */
export const DEFAULT_CATEGORIES: ReadonlyArray<DefaultCategory> = [
  { name: 'Food', subcategories: ['Groceries', 'Restaurant', 'Snacks'] },
  { name: 'Transport', subcategories: ['Taxi', 'Fuel', 'Public Transport'] },
  { name: 'Bills', subcategories: ['Rent', 'Electricity', 'Water', 'Internet', 'Phone'] },
  { name: 'Health', subcategories: ['Pharmacy', 'Doctor'] },
  { name: 'Entertainment', subcategories: ['Streaming', 'Outings'] },
  { name: 'Education', subcategories: ['Books', 'Courses'] },
  { name: 'Shopping', subcategories: ['Clothing', 'Household'] },
  { name: 'Other', subcategories: ['Miscellaneous'] },
];
