import { useCallback, useEffect, useMemo, useState } from 'react';

import { toISODate } from '@/utils/formatDate';

import * as expenseService from './expenses.service';
import type { Category, Expense, TransactionFilter } from './expenses.types';

/**
 * Form state for the expense log screen. Exposes individual field setters
 * (rather than a form-state object) so later slices reusing this shape stay
 * consistent. Validates `amount > 0` and a chosen category before allowing
 * submit.
 */
export function useExpenseLog() {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount);
  const canSubmit =
    Number.isFinite(numericAmount) && numericAmount > 0 && categoryId !== null;

  /** Persists the expense. Returns the new id, or null if invalid / failed. */
  const submit = useCallback(async (): Promise<number | null> => {
    if (!canSubmit || categoryId === null) {
      setError('Enter an amount greater than 0 and pick a category.');
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
      });
      setError(null);
      return id;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save expense.');
      return null;
    }
  }, [canSubmit, categoryId, numericAmount, subcategoryId, note, date]);

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
    submit,
    canSubmit,
    error,
  };
}

/**
 * Loads transactions, re-querying whenever the filter changes. Filtering is
 * done in SQL (not in memory): a category filter takes precedence, then a
 * date range, otherwise all expenses are returned.
 */
export function useTransactions(filter?: TransactionFilter) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryId = filter?.categoryId;
  const from = filter?.from;
  const to = filter?.to;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let result: Expense[];
      if (categoryId != null) {
        result = await expenseService.getExpensesByCategory(categoryId);
      } else if (from != null && to != null) {
        result = await expenseService.getExpensesByDateRange(from, to);
      } else {
        result = await expenseService.getAllExpenses();
      }
      setExpenses(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [categoryId, from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { expenses, loading, error, refresh };
}

/**
 * Loads the full category tree once and derives helpers from it: the parent
 * categories, a synchronous subcategory lookup, and a label resolver that
 * prefers the subcategory name and falls back to the parent name.
 */
export function useCategories() {
  const [all, setAll] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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

  const categories = useMemo(() => all.filter((c) => c.parentId === null), [all]);

  const byId = useMemo(() => new Map(all.map((c) => [c.id, c])), [all]);

  const subcategoriesOf = useCallback(
    (parentId: number) => all.filter((c) => c.parentId === parentId),
    [all],
  );

  const labelFor = useCallback(
    (categoryId: number, subcategoryId: number | null): string => {
      if (subcategoryId != null) {
        return byId.get(subcategoryId)?.name ?? byId.get(categoryId)?.name ?? 'Unknown';
      }
      return byId.get(categoryId)?.name ?? 'Unknown';
    },
    [byId],
  );

  return { categories, subcategoriesOf, labelFor, loading };
}
