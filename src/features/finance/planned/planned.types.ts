/** A named shopping list, with a summary of what is still to buy. */
export interface PlannedList {
  id: number;
  name: string;
  /** Every item on the list, bought or not — tells an empty list from a finished one. */
  itemCount: number;
  /** Items not yet bought. */
  openCount: number;
  /** Sum of the estimates of the items not yet bought, in FCFA. */
  openEstimate: number;
  /**
   * The shopping day, `YYYY-MM-DD`. Required for new lists; null only on lists
   * made before due dates existed. Items without their own date fall due with it.
   */
  dueDate: string | null;
  createdAt: string;
}

/** An open item with the date it falls due — its own date, else its list's. */
export interface DueItem {
  id: number;
  listId: number;
  listName: string;
  name: string;
  estimatedAmount: number;
  /** `YYYY-MM-DD`. */
  dueDate: string;
}

/** How many open items need attention, for the drawer dot and the dashboard. */
export interface PlannedAttention {
  /** Due today or within the warning window. */
  dueSoon: number;
  /** Past their date and still not bought. */
  overdue: number;
}

/** One thing to buy. Bought exactly when `expenseId` points at an existing expense. */
export interface PlannedItem {
  id: number;
  listId: number;
  name: string;
  estimatedAmount: number;
  categoryId: number;
  /** Suggested wallet, editable when the item is bought. */
  accountId: number | null;
  /**
   * The item's own date, overriding its list's due date; null means it falls
   * due with the list. Planned items never affect the budget.
   */
  plannedDate: string | null;
  expenseId: number | null;
  isBought: boolean;
  /** What was actually paid, read live from the linked expense; null until bought. */
  boughtAmount: number | null;
  createdAt: string;
}

/** Input for `createItem`. */
export interface NewPlannedItem {
  listId: number;
  name: string;
  estimatedAmount: number;
  categoryId: number;
  accountId?: number | null;
  plannedDate?: string | null;
}

/** Editable fields of an item; omitted fields are left unchanged. */
export type PlannedItemPatch = Partial<Omit<NewPlannedItem, 'listId'>>;
