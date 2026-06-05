import { useCallback, useEffect, useState } from 'react';

import * as fundsService from './funds.service';
import type { Fund, FundProgress, FundTransaction } from './funds.types';

/**
 * Loads both funds (creating them on first call) and derives their progress.
 * `refresh()` re-fetches — screens call it after a deposit/withdrawal elsewhere.
 * Errors are swallowed into `error` rather than thrown into the UI, mirroring
 * `useAllocation`.
 */
export function useFunds() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [progress, setProgress] = useState<FundProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fundsService.getOrCreateFunds();
      setFunds(rows);
      setProgress(rows.map(fundsService.getFundProgress));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load funds.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { funds, progress, loading, error, refresh };
}

/**
 * Loads a single fund and its transaction history, and exposes `withdraw` and
 * `setTarget` mutations that re-fetch on success. Mirrors `useAllocation`'s
 * error-swallowing shape.
 */
export function useFundDetail(id: number) {
  const [fund, setFund] = useState<Fund | null>(null);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [row, txns] = await Promise.all([
        fundsService.getFundById(id),
        fundsService.getFundTransactions(id),
      ]);
      setFund(row);
      setTransactions(txns);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fund.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const withdraw = useCallback(
    async (amount: number, reason: string): Promise<void> => {
      try {
        await fundsService.withdrawFromFund(id, amount, reason);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to withdraw.');
      }
    },
    [id, refresh],
  );

  const setTarget = useCallback(
    async (target: number | null): Promise<void> => {
      try {
        await fundsService.updateFundTarget(id, target);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update target.');
      }
    },
    [id, refresh],
  );

  return { fund, transactions, loading, error, refresh, withdraw, setTarget };
}
