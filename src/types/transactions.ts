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
}

export interface IncomeEntry {
  type: 'income';
  id: number;
  amount: number;
  date: string;
  source: string;
  sourceLabel: string;
  note: string | null;
}

export type TransactionEntry = ExpenseEntry | IncomeEntry;
