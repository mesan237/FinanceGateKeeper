/**
 * A spending category. Parents have `parentId === null`; subcategories carry
 * the id of their parent. Both live in the same `categories` table.
 */
export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  isDefault: boolean;
  isHidden: boolean;
}

/** Input for creating a category (parent when `parentId` is null) or subcategory. */
export interface NewCategory {
  name: string;
  parentId: number | null;
}

/**
 * A `Category` whose `parentId` is non-null — i.e. a child of another category.
 * No separate shape: subcategories reuse the `Category` table and type.
 */
export type Subcategory = Category;

/** A persisted expense row. */
export interface Expense {
  id: number;
  amount: number;
  categoryId: number;
  subcategoryId: number | null;
  note: string | null;
  date: string;
  isRecurring: boolean;
  createdAt: string;
}

/** The shape accepted by `createExpense` — id and createdAt are assigned on insert. */
export type NewExpense = Omit<Expense, 'id' | 'createdAt'>;

/** Filter applied to the transaction list. All fields are optional. */
export interface TransactionFilter {
  categoryId?: number;
  from?: string;
  to?: string;
}
