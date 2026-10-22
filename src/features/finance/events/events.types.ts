/**
 * An occasion that causes spending (VS-61): a wedding, a funeral, a trip. Tagging
 * expenses with it says *why* they happened, across categories.
 */
export interface SpendingEvent {
  id: number;
  name: string;
  /** `YYYY-MM-DD`, or null when the user gave none. */
  date: string | null;
  createdAt: string;
}

/** What `createEvent` takes. */
export interface NewSpendingEvent {
  name: string;
  date: string | null;
}

/** An event with what it cost, for the list and the picker. */
export interface EventSummary extends SpendingEvent {
  /** Net of refunds, whole FCFA. */
  total: number;
  /** Purchases tagged with it (refund rows not counted). */
  count: number;
}

/** One category's part of an event. */
export interface EventCategorySpend {
  categoryId: number;
  /** Stored name; show it with `displayCategoryName`. */
  categoryLabel: string;
  amount: number;
}

/** One expense tagged with the event. */
export interface EventExpense {
  id: number;
  amount: number;
  date: string;
  note: string | null;
  categoryLabel: string;
  subcategoryLabel: string | null;
  /** Set on a refund row: the purchase it refunds. */
  refundOf: number | null;
}

/** The event page: the event, its total, its split by category and its expenses. */
export interface EventDetail {
  event: SpendingEvent;
  total: number;
  /** Largest first; categories netted to zero or less are left out. */
  byCategory: EventCategorySpend[];
  /** Newest first. */
  expenses: EventExpense[];
}
