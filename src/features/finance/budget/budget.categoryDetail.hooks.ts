import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';

import { getTransactionFeed } from '@/services/transactions';
import type { ExpenseEntry } from '@/types/transactions';

import { getCategoryDetail } from './budget.categoryDetail';
import { getBudgetOverview } from './budget.plan';
import type { CategoryBudgetProgress, CategoryDetail } from './budget.types';

/** Everything the category drill-down shows (VS-56). */
export interface CategoryDetailView {
  detail: CategoryDetail;
  /** The category's envelope row, or null when the month has neither budget nor spend for it. */
  envelope: CategoryBudgetProgress | null;
  /** Other envelopes with spare budget, offered when covering an overspend. */
  coverSources: CategoryBudgetProgress[];
  /** The category's expenses and refunds this month, newest first. */
  transactions: ExpenseEntry[];
}

/**
 * Loads one category's month for the drill-down: the breakdown, its envelope
 * (and the envelopes that could cover it), and its transactions.
 *
 * `refresh` is caller-driven, like `useBudgetOverview`: the screen re-reads on
 * focus, because tapping a transaction opens it for editing elsewhere.
 */
export function useCategoryDetail(monthISO: string, categoryId: number) {
  const [view, setView] = useState<CategoryDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [detail, overview, feed] = await Promise.all([
        getCategoryDetail(monthISO, categoryId),
        getBudgetOverview(monthISO),
        getTransactionFeed(monthISO),
      ]);
      setView({
        detail,
        envelope: overview.categories.find((c) => c.categoryId === categoryId) ?? null,
        coverSources: overview.categories.filter(
          (c) => c.categoryId !== categoryId && c.remaining > 0 && c.allocated > 0,
        ),
        transactions: feed.filter(
          (e): e is ExpenseEntry => e.type === 'expense' && e.categoryId === categoryId,
        ),
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.loadTheBudget', { ns: 'budget' }));
    } finally {
      setLoading(false);
    }
  }, [monthISO, categoryId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  return { view, loading, error, refresh };
}
