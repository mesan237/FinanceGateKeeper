/** The physical nature of a wallet, used to pick its icon. */
export type AccountType = 'cash' | 'mobile_money' | 'bank' | 'card';

/** What the money in a wallet is earmarked for. */
export type AccountPurpose = 'spending' | 'saving' | 'emergency' | 'general';

/** A wallet / payment channel. Balance is computed on read, never stored. */
export interface Account {
  id: number;
  name: string;
  type: AccountType;
  purpose: AccountPurpose;
  openingBalance: number; // FCFA integer
  isDefault: boolean;
  isActive: boolean;
  createdAt: string; // ISO 8601
}

/** A single account-to-account move of money. */
export interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number; // FCFA integer, > 0
  date: string; // YYYY-MM-DD
  note: string | null;
  createdAt: string;
}

/**
 * One month's income/expense activity for an account, expressed both as raw
 * totals and as that account's share of all accounts' totals for the month.
 */
export interface AccountStats {
  accountId: number;
  monthISO: string; // YYYY-MM
  totalIncome: number;
  totalExpenses: number;
  incomePercent: number; // 0–100
  expensePercent: number; // 0–100
}

/** Fields the account form collects when creating a wallet. */
export interface NewAccountFields {
  name: string;
  type: AccountType;
  purpose: AccountPurpose;
  openingBalance?: number; // defaults to 0
  isDefault?: boolean;
}

/** Mutable fields when editing an existing wallet. */
export type AccountPatch = Partial<NewAccountFields>;

/** Kinds of entry that appear in an account's transaction history. */
export type AccountHistoryKind =
  | 'income'
  | 'expense'
  | 'transfer_in'
  | 'transfer_out'
  | 'fund_contribution'
  | 'project_contribution';

/**
 * A single row in an account's history. `amount` is always positive; `kind`
 * carries the direction (credits vs debits) so the UI can sign and colour it.
 */
export interface AccountHistoryEntry {
  kind: AccountHistoryKind;
  refId: number; // id of the underlying source row
  label: string;
  amount: number;
  date: string; // YYYY-MM-DD
}
