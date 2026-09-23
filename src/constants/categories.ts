export interface DefaultCategorySeed {
  name: string;
  sort_order: number;
  children: ReadonlyArray<string>;
}

export const DEFAULT_CATEGORIES: ReadonlyArray<DefaultCategorySeed> = [
  { name: 'Housing', sort_order: 1, children: ['Rent', 'Electricity'] },
  { name: 'Transport', sort_order: 2, children: [] },
  {
    name: 'Food & Drink',
    sort_order: 3,
    children: ['Raw food', 'Eating out', 'Groceries', 'Drinks'],
  },
  {
    name: 'Communication',
    sort_order: 4,
    children: ['Phone data', 'Phone credit'],
  },
  {
    name: 'Shopping',
    sort_order: 5,
    children: ['Clothing', 'Personal care', 'Household items'],
  },
  {
    name: 'Gifts & Help',
    sort_order: 6,
    children: ['Gifts', 'Financial help'],
  },
  { name: 'Health', sort_order: 7, children: ['Pharmacy', 'Consultation'] },
  { name: 'Other', sort_order: 8, children: [] },
];
