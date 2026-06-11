export interface ExpenseEntry {
  type: 'expense';
  id: number;
  amount: number;
  date: string;
  categoryId: number;
  categoryLabel: string;
  subcategoryId: number | null;
  subcategoryLabel: string | null;
  note: string | null;
  /** Source wallet id, or null for legacy rows logged before accounts (VS-18). */
  accountId: number | null;
  /** Source wallet name, or null when `accountId` is null. */
  accountLabel: string | null;
}

export interface IncomeEntry {
  type: 'income';
  id: number;
  amount: number;
  date: string;
  source: string;
  sourceLabel: string;
  note: string | null;
  /** Destination wallet id, or null for legacy rows (VS-18). */
  accountId: number | null;
  /** Destination wallet name, or null when `accountId` is null. */
  accountLabel: string | null;
}

export interface TransferEntry {
  type: 'transfer';
  id: number;
  amount: number;
  date: string;
  fromAccountName: string;
  toAccountName: string;
}

export type TransactionEntry = ExpenseEntry | IncomeEntry | TransferEntry;
