import { useCallback, useEffect, useMemo, useState } from 'react';

import { toISODate } from '@/utils/formatDate';

import * as service from './accounts.service';
import type { Account, AccountHistoryEntry, AccountStats } from './accounts.types';

/**
 * Loads the active accounts plus a `{ [id]: balance }` map (balances are
 * computed per account in the service). Exposes `refresh` for callers that
 * mutate accounts and want fresh data.
 */
export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await service.getAccounts();
      const pairs = await Promise.all(
        rows.map(async (a) => [a.id, await service.getAccountBalance(a.id)] as const),
      );
      setAccounts(rows);
      setBalances(Object.fromEntries(pairs));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { accounts, balances, loading, error, refresh };
}

/**
 * Loads one account with its computed balance and full transaction history,
 * newest first. Exposes `refresh` so an edit can re-pull.
 */
export function useAccountDetail(id: number) {
  const [account, setAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<AccountHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, bal, hist] = await Promise.all([
        service.getAccountById(id),
        service.getAccountBalance(id),
        service.getAccountHistory(id),
      ]);
      setAccount(acc);
      setBalance(bal);
      setHistory(hist);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load account.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { account, balance, history, loading, error, refresh };
}

/**
 * Resolves the user's default account id once accounts load (null until then,
 * or when no accounts exist). Consumer forms use it to pre-select the account
 * picker without owning the full accounts list.
 */
export function useDefaultAccountId(): number | null {
  const [defaultId, setDefaultId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const accounts = await service.getAccounts();
        const def = accounts.find((a) => a.isDefault) ?? accounts[0];
        if (!cancelled && def) setDefaultId(def.id);
      } catch {
        // A missing default simply leaves the picker unset; not a hard error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return defaultId;
}

/** Loads an account's income/expense stats for a month. */
export function useAccountStats(id: number, monthISO: string) {
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const s = await service.getAccountStats(id, monthISO);
        if (!cancelled) {
          setStats(s);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load stats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, monthISO]);

  return { stats, loading, error };
}

/**
 * Drives the transfer form. The from-account defaults to the user's default
 * account once accounts load; the date defaults to today. `canSubmit` requires
 * two distinct accounts and a positive amount. `submit` returns true on success.
 */
export function useTransferLog() {
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const accounts = await service.getAccounts();
        const def = accounts.find((a) => a.isDefault) ?? accounts[0];
        if (!cancelled && def) setFromId(def.id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load accounts.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const numericAmount = Math.trunc(Number(amount));
  const canSubmit = useMemo(
    () =>
      fromId !== null &&
      toId !== null &&
      fromId !== toId &&
      Number.isFinite(numericAmount) &&
      numericAmount > 0,
    [fromId, toId, numericAmount],
  );

  const submit = useCallback(async (): Promise<boolean> => {
    if (fromId === null || toId === null) return false;
    try {
      await service.logTransfer(fromId, toId, numericAmount, date, note.trim() || undefined);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log transfer.');
      return false;
    }
  }, [fromId, toId, numericAmount, date, note]);

  return {
    fromId,
    setFromId,
    toId,
    setToId,
    amount,
    setAmount,
    date,
    setDate,
    note,
    setNote,
    canSubmit,
    error,
    submit,
  };
}
