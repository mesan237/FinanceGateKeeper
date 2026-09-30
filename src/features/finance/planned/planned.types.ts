/** A named shopping list, with a summary of what is still to buy. */
export interface PlannedList {
  id: number;
  name: string;
  /** Items not yet bought. */
  openCount: number;
  /** Sum of the estimates of the items not yet bought, in FCFA. */
  openEstimate: number;
  createdAt: string;
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
  /** Informational only — planned items never affect the budget. */
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
