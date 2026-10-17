import { useCallback, useEffect, useState } from 'react';

import { getCashOnHand } from '@/features/finance/accounts/accounts.service';

import { addSurplusToBudget, leaveSurplusUnbudgeted } from './budget.cashflow';
import { getCommitted } from './budget.committed';
import type { MonthlyPlan, MoneyView } from './budget.types';

/**
 * The Budget tab's cash-flow pieces (VS-47): the money view (cash in wallets
 * and committed money) and the two answers to "give it a job".
 *
 * Cash is today's figure, so the money view loads only while `enabled` — the
 * tab passes true for the current month alone. Showing today's wallets beside
 * a past month's budget would compare two different moments.
 *
 * Reads wallet balances through the approved `budget → accounts` edge.
 */
export function useCashflow(monthISO: string, enabled: boolean) {
  const [money, setMoney] = useState<MoneyView | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setMoney(null);
      return;
    }
    try {
      const [cash, committed] = await Promise.all([getCashOnHand(), getCommitted(monthISO)]);
      setMoney({ cash, committed });
    } catch {
      // The money view is supplementary; the budget still renders without it.
      setMoney(null);
    }
  }, [monthISO, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Adds the month's unbudgeted income to its budget. */
  const addToBudget = useCallback((plan: MonthlyPlan) => addSurplusToBudget(plan), []);

  /** Records the month's unbudgeted income as deliberately left unassigned. */
  const leaveUnbudgeted = useCallback(
    (plan: MonthlyPlan) => leaveSurplusUnbudgeted(plan.month, plan.unbudgetedIncome),
    [],
  );

  return { money, refresh, addToBudget, leaveUnbudgeted };
}
