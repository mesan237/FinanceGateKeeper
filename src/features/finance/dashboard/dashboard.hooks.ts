import { useCallback, useEffect, useState } from 'react';

import { currentMonthISO } from '@/utils/formatDate';

import * as dashboardService from './dashboard.service';
import type { DashboardState } from './dashboard.types';

/**
 * Loads the dashboard snapshot for the current month. Re-fetches when
 * `includeBudgetData` changes (mode toggle). Exposes `refresh` so the screen
 * can re-fetch on focus after activity elsewhere.
 */
export function useDashboard(opts: { includeBudgetData: boolean }) {
  const { includeBudgetData } = opts;
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await dashboardService.getDashboardSnapshot(currentMonthISO(), {
        includeBudgetData,
      });
      setState(snapshot);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard.');
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [includeBudgetData]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { state, loading, error, refresh };
}
