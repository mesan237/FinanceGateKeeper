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

/**
 * The closed set of recurrence cadences. A small, fixed enum (like
 * `IncomeSource`) — guarded by a `CHECK` constraint at the DB layer and a
 * runtime check in the service. Lives in the slice (not `constants/`) because
 * nothing outside the expenses feature references it.
 */
export type Frequency = 'monthly' | 'weekly';

/**
 * A one-tap quick-add template: a pre-filled label + amount + category that
 * logs an expense instantly when tapped. `sortOrder` keeps the grid stable.
 */
export interface QuickAddTemplate {
  id: number;
  label: string;
  amount: number;
  categoryId: number;
  subcategoryId: number | null;
  sortOrder: number;
  createdAt: string;
}

/** Input for `createQuickAddTemplate` — id, sortOrder, and createdAt are assigned on insert. */
export type NewQuickAddTemplate = Omit<QuickAddTemplate, 'id' | 'sortOrder' | 'createdAt'>;

/**
 * A registered recurring expense. The auto-logger inserts an expense and
 * advances `nextDueDate` by one `frequency` period each time the due date is
 * reached. `isActive` pauses auto-logging without losing the template.
 */
export interface RecurringExpense {
  id: number;
  label: string;
  amount: number;
  categoryId: number;
  subcategoryId: number | null;
  frequency: Frequency;
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
}

/** Input for `createRecurringExpense` — id and createdAt are assigned on insert. */
export type NewRecurringExpense = Omit<RecurringExpense, 'id' | 'createdAt'>;
