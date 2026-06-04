import { useCallback, useEffect, useState } from 'react';

import type { IncomeSource } from '@/constants/incomeSources';
import { toISODate } from '@/utils/formatDate';

import * as incomeService from './income.service';
import type { Income, IncomeFilter } from './income.types';

/**
 * Form state for the income log screen. Exposes individual field setters (rather
 * than a form-state object) to match `useExpenseLog`. Validates `amount > 0` and
 * a chosen source before allowing submit; clears the form on a successful save
 * so the user can log another entry without leaving the screen.
 */
export function useIncomeLog() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<IncomeSource | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount);
  const canSubmit = Number.isFinite(numericAmount) && numericAmount > 0 && source !== null;

  const reset = useCallback(() => {
    setAmount('');
    setSource(null);
    setNote('');
    setDate(toISODate(new Date()));
  }, []);

  /** Persists the income. Returns the new id, or null if invalid / failed. */
  const submit = useCallback(async (): Promise<number | null> => {
    if (!canSubmit || source === null) {
      setError('Enter an amount greater than 0 and pick a source.');
      return null;
    }
    try {
      const id = await incomeService.createIncome({
        amount: Math.trunc(numericAmount),
        source,
        note: note.trim() ? note.trim() : null,
        date,
      });
      setError(null);
      reset();
      return id;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save income.');
      return null;
    }
  }, [canSubmit, source, numericAmount, note, date, reset]);

  return {
    amount,
    setAmount,
    source,
    setSource,
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
 * Loads income, re-querying whenever the filter changes. Filtering is done in
 * SQL (not in memory): a source filter takes precedence, then a date range,
 * otherwise all income is returned.
 */
export function useIncomeHistory(filter?: IncomeFilter) {
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const source = filter?.source;
  const from = filter?.from;
  const to = filter?.to;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let result: Income[];
      if (source != null) {
        result = await incomeService.getIncomeBySource(source);
      } else if (from != null && to != null) {
        result = await incomeService.getIncomeByDateRange(from, to);
      } else {
        result = await incomeService.getAllIncome();
      }
      setIncome(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load income.');
    } finally {
      setLoading(false);
    }
  }, [source, from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { income, loading, error, refresh };
}
