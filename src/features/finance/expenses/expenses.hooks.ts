import i18n from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { displayCategoryName } from '@/i18n/categoryNames';
import { getTransactionFeed } from '@/services/transactions';
import type { TransactionEntry } from '@/types/transactions';
import { toISODate } from '@/utils/formatDate';

import * as expenseService from './expenses.service';
import type {
  Category,
  DayActivityStatus,
  ExpenseEditableFields,
  FeedFilter,
  NewCategory,
  NewQuickAddTemplate,
  NewRecurringExpense,
  QuickAddTemplate,
  RecurringExpense,
} from './expenses.types';

/** Label for a category id that no longer resolves, in the active UI language. */
function unknownLabel(): string {
  return i18n.t('unknownCategory', { ns: 'expenses' });
}

/** External state a caller can own so a value survives this hook unmounting. */
export interface ControlledField {
  value: string;
  onChange: (value: string) => void;
}

/** Per-field validation messages; a key is set only while that field is invalid. */
export interface ExpenseFieldErrors {
  amount?: string;
  category?: string;
}

export interface UseExpenseLogOptions {
  /** Lift `amount` to a parent so it persists across form remounts (e.g. the
   *  Add-transaction sheet keeping the figure when toggling Expense/Income). */
  amount?: ControlledField;
  /** Lift `note` to a parent, same rationale as `amount`. */
  note?: ControlledField;
}

/**
 * Form state for the expense log screen. Exposes individual field setters
 * (rather than a form-state object) so later slices reusing this shape stay
 * consistent. Validates `amount > 0` and a chosen category before allowing
 * submit. `amount`/`note` may be lifted to a parent via `options` so their
 * values survive the form unmounting. `fieldErrors` stays empty until the first
 * `validate`/`submit` attempt, then tracks each field live so a message clears
 * the moment the user fixes it.
 */
export function useExpenseLog(options?: UseExpenseLogOptions) {
  const internalAmount = useState('');
  const internalNote = useState('');
  const amount = options?.amount ? options.amount.value : internalAmount[0];
  const setAmount = options?.amount ? options.amount.onChange : internalAmount[1];
  const note = options?.note ? options.note.value : internalNote[0];
  const setNote = options?.note ? options.note.onChange : internalNote[1];
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [accountId, setAccountId] = useState<number | null>(null);
  const [isUnplanned, setIsUnplanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const numericAmount = Number(amount);
  const amountValid = Number.isFinite(numericAmount) && numericAmount > 0;
  const canSubmit = amountValid && categoryId !== null;

  const fieldErrors: ExpenseFieldErrors = {};
  if (attempted && !amountValid) {
    fieldErrors.amount = i18n.t('validation.amountRequired', { ns: 'expenses' });
  }
  if (attempted && categoryId === null) {
    fieldErrors.category = i18n.t('validation.categoryRequired', { ns: 'expenses' });
  }

  /** Marks the form as attempted (revealing field errors) and returns whether it is valid. */
  const validate = useCallback((): boolean => {
    setAttempted(true);
    return canSubmit;
  }, [canSubmit]);

  /** Persists the expense. Returns the new id, or null if invalid / failed. */
  const submit = useCallback(async (): Promise<number | null> => {
    if (!canSubmit || categoryId === null) {
      setAttempted(true);
      return null;
    }
    try {
      const id = await expenseService.createExpense({
        amount: Math.trunc(numericAmount),
        categoryId,
        subcategoryId,
        note: note.trim() ? note.trim() : null,
        date,
        isRecurring: false,
        accountId,
        isUnplanned,
      });
      setError(null);
      return id;
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.saveFailed', { ns: 'expenses' }));
      return null;
    }
  }, [canSubmit, categoryId, numericAmount, subcategoryId, note, date, accountId, isUnplanned]);

  return {
    amount,
    setAmount,
    categoryId,
    setCategoryId,
    subcategoryId,
    setSubcategoryId,
    note,
    setNote,
    date,
    setDate,
    accountId,
    setAccountId,
    isUnplanned,
    setIsUnplanned,
    submit,
    validate,
    canSubmit,
    fieldErrors,
    error,
  };
}

/**
 * Loads the unified income+expense feed for a calendar month, re-querying
 * whenever `monthISO` changes. The optional filter is applied client-side:
 *
 * - a category id keeps the matching expenses and every income row;
 * - `'unplanned'` keeps only the expenses marked as imprévus.
 *
 * @param monthISO YYYY-MM string, e.g. "2026-06".
 * @param filter The active feed chip; null or omitted shows everything.
 */
export function useTransactions(
  monthISO: string,
  filter?: FeedFilter,
): { entries: TransactionEntry[]; loading: boolean; error: string | null; refresh: () => void } {
  const [allEntries, setAllEntries] = useState<TransactionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAllEntries(await getTransactionFeed(monthISO));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.loadTransactions', { ns: 'expenses' }));
    } finally {
      setLoading(false);
    }
  }, [monthISO]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const entries = useMemo(() => {
    if (filter == null) return allEntries;
    if (filter === 'unplanned') {
      return allEntries.filter((e) => e.type === 'expense' && e.isUnplanned);
    }
    // A category filter keeps all income and the matching expenses; transfers
    // (no category) drop out, like non-matching expenses.
    return allEntries.filter((e) =>
      e.type === 'expense' ? e.categoryId === filter : e.type === 'income',
    );
  }, [allEntries, filter]);

  return { entries, loading, error, refresh };
}

/**
 * Loads the full category tree (including hidden rows, so labels always
 * resolve) and exposes derived views plus category CRUD. Mutations re-fetch
 * rather than patching an in-memory cache — cheap and coherent for a local DB.
 *
 * - `categories` — visible parents, for the picker.
 * - `managedCategories` — all parents incl. hidden, for the manager.
 * - `subcategoriesOf(parentId, includeHidden?)` — children (visible by default).
 * - `labelFor` — subcategory name, falling back to the parent name (stored, for icon lookups).
 * - `displayLabelFor` — the same, as shown to the user in the active language.
 */
export function useCategories() {
  const [all, setAll] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await expenseService.getAllCategories();
    setAll(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const rows = await expenseService.getAllCategories();
      if (active) {
        setAll(rows);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => all.filter((c) => c.parentId === null && !c.isHidden),
    [all],
  );

  const managedCategories = useMemo(() => all.filter((c) => c.parentId === null), [all]);

  const byId = useMemo(() => new Map(all.map((c) => [c.id, c])), [all]);

  const subcategoriesOf = useCallback(
    (parentId: number, includeHidden = false) =>
      all.filter((c) => c.parentId === parentId && (includeHidden || !c.isHidden)),
    [all],
  );

  const labelFor = useCallback(
    (categoryId: number, subcategoryId: number | null): string => {
      if (subcategoryId != null) {
        return byId.get(subcategoryId)?.name ?? byId.get(categoryId)?.name ?? unknownLabel();
      }
      return byId.get(categoryId)?.name ?? unknownLabel();
    },
    [byId],
  );

  // Like `labelFor`, but in the active language: a seeded default is
  // translated, a user's own category is shown exactly as typed.
  const displayLabelFor = useCallback(
    (categoryId: number, subcategoryId: number | null): string => {
      const row =
        (subcategoryId != null ? byId.get(subcategoryId) : undefined) ?? byId.get(categoryId);
      return row ? displayCategoryName(row.name, row.isDefault) : unknownLabel();
    },
    [byId],
  );

  const addCategory = useCallback(
    async (input: NewCategory) => {
      await expenseService.createCategory(input);
      await refresh();
    },
    [refresh],
  );

  const rename = useCallback(
    async (id: number, name: string) => {
      await expenseService.renameCategory(id, name);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: number, reassignToId: number) => {
      await expenseService.deleteCategory(id, reassignToId);
      await refresh();
    },
    [refresh],
  );

  const toggleHidden = useCallback(
    async (id: number, hidden: boolean) => {
      await expenseService.setCategoryHidden(id, hidden);
      await refresh();
    },
    [refresh],
  );

  const reorder = useCallback(
    async (orderedIds: number[]) => {
      await expenseService.reorderCategories(orderedIds);
      await refresh();
    },
    [refresh],
  );

  return {
    categories,
    managedCategories,
    subcategoriesOf,
    labelFor,
    displayLabelFor,
    loading,
    refresh,
    addCategory,
    rename,
    remove,
    toggleHidden,
    reorder,
  };
}

/**
 * Loads quick-add templates and exposes one-tap logging plus CRUD. Like the
 * other hooks here, mutations re-fetch on success rather than patching an
 * in-memory cache. `log(id, dateISO?)` creates an expense from the template,
 * dated `dateISO` (default: today).
 */
export function useQuickAdd() {
  const [templates, setTemplates] = useState<QuickAddTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await expenseService.getQuickAddTemplates());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.loadTemplates', { ns: 'expenses' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const log = useCallback(async (id: number, dateISO?: string): Promise<number | null> => {
    try {
      const expenseId = await expenseService.logFromQuickAddTemplate(id, dateISO);
      setError(null);
      return expenseId;
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.logTemplate', { ns: 'expenses' }));
      return null;
    }
  }, []);

  const add = useCallback(
    async (input: NewQuickAddTemplate) => {
      await expenseService.createQuickAddTemplate(input);
      await refresh();
    },
    [refresh],
  );

  const update = useCallback(
    async (id: number, patch: Partial<NewQuickAddTemplate>) => {
      await expenseService.updateQuickAddTemplate(id, patch);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: number) => {
      await expenseService.deleteQuickAddTemplate(id);
      await refresh();
    },
    [refresh],
  );

  return { templates, loading, error, refresh, log, add, update, remove };
}

/**
 * Loads recurring expenses and exposes CRUD plus the active toggle and the
 * "skip next occurrence" action. Mutations re-fetch on success.
 */
export function useRecurring() {
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRecurring(await expenseService.getRecurringExpenses());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.loadRecurring', { ns: 'expenses' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (input: NewRecurringExpense) => {
      await expenseService.createRecurringExpense(input);
      await refresh();
    },
    [refresh],
  );

  const update = useCallback(
    async (id: number, patch: Partial<NewRecurringExpense>) => {
      await expenseService.updateRecurringExpense(id, patch);
      await refresh();
    },
    [refresh],
  );

  const setActive = useCallback(
    async (id: number, isActive: boolean) => {
      await expenseService.setRecurringActive(id, isActive);
      await refresh();
    },
    [refresh],
  );

  const skip = useCallback(
    async (id: number) => {
      await expenseService.skipRecurringOccurrence(id);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: number) => {
      await expenseService.deleteRecurringExpense(id);
      await refresh();
    },
    [refresh],
  );

  return { recurring, loading, error, refresh, add, update, setActive, skip, remove };
}

/**
 * Loads an expense by id on mount, exposes field setters pre-filled with the
 * loaded values, and provides `update` (persist changed fields) and `remove`
 * (delete with navigation handled by the caller). Re-fetches after a successful
 * update so callers that stay mounted see fresh data.
 */
export function useExpenseEdit(id: number): {
  amount: string;
  setAmount: (v: string) => void;
  categoryId: number | null;
  setCategoryId: (v: number | null) => void;
  subcategoryId: number | null;
  setSubcategoryId: (v: number | null) => void;
  note: string;
  setNote: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  accountId: number | null;
  setAccountId: (v: number | null) => void;
  isUnplanned: boolean;
  setIsUnplanned: (v: boolean) => void;
  originalAmount: number | null;
  canSubmit: boolean;
  loading: boolean;
  error: string | null;
  update: () => Promise<boolean>;
  remove: () => Promise<boolean>;
} {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [originalAmount, setOriginalAmount] = useState<number | null>(null);
  const [originalCategoryId, setOriginalCategoryId] = useState<number | null>(null);
  const [originalSubcategoryId, setOriginalSubcategoryId] = useState<number | null>(null);
  const [originalNote, setOriginalNote] = useState<string | null>(null);
  const [originalDate, setOriginalDate] = useState('');
  const [originalAccountId, setOriginalAccountId] = useState<number | null>(null);
  const [isUnplanned, setIsUnplanned] = useState(false);
  const [originalIsUnplanned, setOriginalIsUnplanned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const expense = await expenseService.getExpenseById(id);
      if (!expense) {
        setError(i18n.t('errors.expenseNotFound', { ns: 'expenses' }));
        return;
      }
      setAmount(String(expense.amount));
      setCategoryId(expense.categoryId);
      setSubcategoryId(expense.subcategoryId);
      setNote(expense.note ?? '');
      setDate(expense.date);
      setAccountId(expense.accountId);
      setOriginalAmount(expense.amount);
      setOriginalCategoryId(expense.categoryId);
      setOriginalSubcategoryId(expense.subcategoryId);
      setOriginalNote(expense.note ?? null);
      setOriginalDate(expense.date);
      setOriginalAccountId(expense.accountId);
      setIsUnplanned(expense.isUnplanned);
      setOriginalIsUnplanned(expense.isUnplanned);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.loadExpense', { ns: 'expenses' }));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const numericAmount = Number(amount);
  const canSubmit =
    Number.isFinite(numericAmount) && numericAmount > 0 && categoryId !== null;

  const update = useCallback(async (): Promise<boolean> => {
    try {
      const fields: Partial<ExpenseEditableFields> = {};
      const newAmount = Math.trunc(numericAmount);
      if (newAmount !== originalAmount) fields.amount = newAmount;
      if (categoryId !== originalCategoryId) fields.categoryId = categoryId ?? undefined;
      if (subcategoryId !== originalSubcategoryId) fields.subcategoryId = subcategoryId;
      const trimmedNote = note.trim() || null;
      if (trimmedNote !== originalNote) fields.note = trimmedNote;
      if (date !== originalDate) fields.date = date;
      if (accountId !== originalAccountId) fields.accountId = accountId;
      if (isUnplanned !== originalIsUnplanned) fields.isUnplanned = isUnplanned;

      await expenseService.updateExpense(id, fields);
      await load();
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.updateExpense', { ns: 'expenses' }));
      return false;
    }
  }, [id, numericAmount, originalAmount, categoryId, originalCategoryId, subcategoryId, originalSubcategoryId, note, originalNote, date, originalDate, accountId, originalAccountId, isUnplanned, originalIsUnplanned, load]);

  const remove = useCallback(async (): Promise<boolean> => {
    try {
      await expenseService.deleteExpense(id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.deleteExpense', { ns: 'expenses' }));
      return false;
    }
  }, [id]);

  return {
    amount,
    setAmount,
    categoryId,
    setCategoryId,
    subcategoryId,
    setSubcategoryId,
    note,
    setNote,
    date,
    setDate,
    accountId,
    setAccountId,
    isUnplanned,
    setIsUnplanned,
    originalAmount,
    canSubmit,
    loading,
    error,
    update,
    remove,
  };
}

/**
 * Tracks today's zero-day status and exposes a one-tap confirmation. `confirm()`
 * records a zero-day for today, then re-reads the status so the prompt's gate
 * closes. Used by the zero-day prompt; the day defaults to today.
 */
export function useZeroDay() {
  const [status, setStatus] = useState<DayActivityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setStatus(await expenseService.getDayActivityStatus());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const confirm = useCallback(async () => {
    await expenseService.confirmZeroDay();
    await refresh();
  }, [refresh]);

  return { status, loading, refresh, confirm };
}
