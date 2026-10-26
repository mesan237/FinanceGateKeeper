import i18n from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { toISODate } from '@/utils/formatDate';

import * as service from './accounts.service';
import type { Account, AccountHistoryEntry, AccountStats, BalanceFreshness } from './accounts.types';

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
      setError(e instanceof Error ? e.message : i18n.t('errors.loadAccounts', { ns: 'accounts' }));
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
 * How far the wallet balances can be trusted (UX-21, F-11): how recently every
 * wallet was confirmed and how much spending sits outside every wallet. Null
 * until read, or when it cannot be read — the figures it qualifies still show.
 * `refresh` is caller-driven (Home re-reads on focus).
 */
export function useWalletTrust() {
  const [freshness, setFreshness] = useState<BalanceFreshness | null>(null);
  const [unassigned, setUnassigned] = useState<{ count: number; total: number } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [f, u] = await Promise.all([
        service.getBalanceFreshness(toISODate(new Date())),
        service.getUnassignedSpending(),
      ]);
      setFreshness(f);
      setUnassigned(u);
    } catch {
      setFreshness(null);
      setUnassigned(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { freshness, unassigned, refresh };
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
      setError(e instanceof Error ? e.message : i18n.t('errors.loadAccount', { ns: 'accounts' }));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Balance checks (VS-42): pin the wallet to what it actually holds today, or
  // drop a check. Both re-read the balance and history.
  const confirm = useCallback(
    async (actual: number) => {
      await service.confirmBalance(id, actual);
      await refresh();
    },
    [id, refresh],
  );
  const removeCheck = useCallback(
    async (checkId: number) => {
      await service.removeBalanceCheck(checkId);
      await refresh();
    },
    [refresh],
  );
  /** Hides the wallet (soft delete): its history stays, it leaves lists, pickers and totals. */
  const hide = useCallback(() => service.hideAccount(id), [id]);

  return { account, balance, history, loading, error, refresh, confirm, removeCheck, hide };
}

/**
 * How much spending no wallet accounts for (VS-42), loaded once. Failures read
 * as none: this is a hint, not a figure anything else depends on.
 */
export function useUnassignedSpending() {
  const [unassigned, setUnassigned] = useState({ count: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;
    service
      .getUnassignedSpending()
      .then((value) => {
        if (!cancelled) setUnassigned(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return unassigned;
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
        if (!cancelled) setError(e instanceof Error ? e.message : i18n.t('errors.loadStats', { ns: 'accounts' }));
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
 *
 * With `transferId` the form edits that transfer instead (VS-43): it loads the
 * stored fields, `submit` saves the correction, and `remove` deletes it.
 *
 * `initialToId` pre-selects the destination of a new transfer — "Save now" on
 * a goal opens the form pointed at the goal's wallet (VS-48).
 */
export function useTransferLog(transferId?: number, initialToId?: number) {
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(initialToId ?? null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (transferId !== undefined) {
          const existing = await service.getTransferById(transferId);
          if (cancelled) return;
          if (!existing) {
            setError(i18n.t('errors.transferNotFound', { ns: 'accounts' }));
            return;
          }
          setFromId(existing.fromAccountId);
          setToId(existing.toAccountId);
          setAmount(String(existing.amount));
          setDate(existing.date);
          setNote(existing.note ?? '');
          return;
        }
        const accounts = await service.getAccounts();
        const def = accounts.find((a) => a.isDefault) ?? accounts[0];
        if (!cancelled && def) setFromId(def.id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : i18n.t('errors.loadAccounts', { ns: 'accounts' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transferId]);

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
      if (transferId !== undefined) {
        await service.updateTransfer(transferId, {
          fromAccountId: fromId,
          toAccountId: toId,
          amount: numericAmount,
          date,
          note: note.trim() || null,
        });
      } else {
        await service.logTransfer(fromId, toId, numericAmount, date, note.trim() || undefined);
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.logTransfer', { ns: 'accounts' }));
      return false;
    }
  }, [transferId, fromId, toId, numericAmount, date, note]);

  const remove = useCallback(async (): Promise<boolean> => {
    if (transferId === undefined) return false;
    try {
      await service.removeTransfer(transferId);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.logTransfer', { ns: 'accounts' }));
      return false;
    }
  }, [transferId]);

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
    remove,
    isEditing: transferId !== undefined,
  };
}
