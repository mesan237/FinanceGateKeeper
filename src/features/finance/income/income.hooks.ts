import { useCallback, useEffect, useState } from 'react';

import type { IncomeSource } from '@/constants/incomeSources';
import { toISODate } from '@/utils/formatDate';

import * as incomeService from './income.service';
import type { Income, IncomeFilter } from './income.types';

/** External state a caller can own so a value survives this hook unmounting. */
export interface ControlledField {
  value: string;
  onChange: (value: string) => void;
}

export interface UseIncomeLogOptions {
  /** Lift `amount` to a parent so it persists across form remounts (e.g. the
   *  Add-transaction sheet keeping the figure when toggling Expense/Income). */
  amount?: ControlledField;
  /** Lift `note` to a parent, same rationale as `amount`. */
  note?: ControlledField;
}

/**
 * Form state for the income log screen. Exposes individual field setters (rather
 * than a form-state object) to match `useExpenseLog`. Validates `amount > 0` and
 * a chosen source before allowing submit; clears the form on a successful save
 * so the user can log another entry without leaving the screen. `amount`/`note`
 * may be lifted to a parent via `options` so their values survive an unmount.
 */
export function useIncomeLog(options?: UseIncomeLogOptions) {
  const internalAmount = useState('');
  const internalNote = useState('');
  const amount = options?.amount ? options.amount.value : internalAmount[0];
  const setAmount = options?.amount ? options.amount.onChange : internalAmount[1];
  const note = options?.note ? options.note.value : internalNote[0];
  const setNote = options?.note ? options.note.onChange : internalNote[1];
  const [source, setSource] = useState<IncomeSource | null>(null);
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [accountId, setAccountId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount);
  const canSubmit = Number.isFinite(numericAmount) && numericAmount > 0 && source !== null;

  const reset = useCallback(() => {
    setAmount('');
    setSource(null);
    setNote('');
    setDate(toISODate(new Date()));
    // account is intentionally NOT reset — the user usually logs into the same wallet.
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
        accountId,
      });
      setError(null);
      reset();
      return id;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save income.');
      return null;
    }
  }, [canSubmit, source, numericAmount, note, date, accountId, reset]);

  return {
    amount,
    setAmount,
    source,
    setSource,
    note,
    setNote,
    date,
    setDate,
    accountId,
    setAccountId,
    submit,
    canSubmit,
    error,
  };
}

/**
 * Form state for the income detail/edit screen (VS-20). Loads the row, exposes
 * pre-filled field state and boolean `update`/`remove` results so the caller
 * can navigate on success. Mirrors
 * `useExpenseEdit`, minus the original-value diffing (no over-budget check on
 * income).
 */
export function useIncomeEdit(id: number) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<IncomeSource | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const income = await incomeService.getIncomeById(id);
        if (cancelled) return;
        if (!income) {
          setNotFound(true);
          setError('Income not found.');
          return;
        }
        setAmount(String(income.amount));
        setSource(income.source);
        setNote(income.note ?? '');
        setDate(income.date);
        setAccountId(income.accountId);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load income.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const numericAmount = Number(amount);
  const canSubmit =
    !notFound && Number.isFinite(numericAmount) && numericAmount > 0 && source !== null;

  /** Persists the full patch. Returns true on success so the screen can navigate. */
  const update = useCallback(async (): Promise<boolean> => {
    if (!canSubmit || source === null) {
      setError('Enter an amount greater than 0 and pick a source.');
      return false;
    }
    try {
      await incomeService.updateIncome(id, {
        amount: Math.trunc(numericAmount),
        source,
        note: note.trim() ? note.trim() : null,
        date,
        accountId,
      });
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update income.');
      return false;
    }
  }, [id, canSubmit, source, numericAmount, note, date, accountId]);

  /** Deletes the row. Returns true on success so the screen can navigate. */
  const remove = useCallback(async (): Promise<boolean> => {
    try {
      await incomeService.deleteIncome(id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete income.');
      return false;
    }
  }, [id]);

  return {
    amount,
    setAmount,
    source,
    setSource,
    note,
    setNote,
    date,
    setDate,
    accountId,
    setAccountId,
    loading,
    notFound,
    canSubmit,
    error,
    update,
    remove,
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
