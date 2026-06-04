import type { IncomeSource } from '@/constants/incomeSources';

// Re-exported so this slice's types have their documented home here, while the
// enum's single source of truth stays in `@/constants/incomeSources` (see that
// file for why it lives in constants rather than the feature).
export type { IncomeSource };

/** A persisted income row. */
export interface Income {
  id: number;
  amount: number;
  source: IncomeSource;
  note: string | null;
  date: string;
  createdAt: string;
}

/** The shape accepted by `createIncome` — id and createdAt are assigned on insert. */
export type NewIncome = Omit<Income, 'id' | 'createdAt'>;

/** Filter applied to the income history. All fields are optional. */
export interface IncomeFilter {
  source?: IncomeSource;
  from?: string;
  to?: string;
}
