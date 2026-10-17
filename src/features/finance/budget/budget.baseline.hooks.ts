import { useCallback, useEffect, useState } from 'react';

import { getBaseline, getBaselineChecklist, saveEstimates, setBaselineFact } from './budget.baseline';
import type { Baseline, BaselineKind, BaselineStep, Estimates } from './budget.types';

/**
 * The dashboard checklist (VS-46): its steps, whether the user hid it, and the
 * one-tap answers ("no debts", "categories look right", "hide"). `refresh` is
 * caller-driven — the card calls it on focus, since steps are completed on
 * other screens.
 */
export function useBaselineChecklist() {
  const [steps, setSteps] = useState<BaselineStep[]>([]);
  const [hidden, setHidden] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [checklist, baseline] = await Promise.all([getBaselineChecklist(), getBaseline()]);
      setSteps(checklist);
      setHidden(baseline.checklistHidden);
    } catch {
      // The checklist is a helper; if it cannot load it simply stays hidden.
      setHidden(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const answer = useCallback(
    async (kind: BaselineKind) => {
      await setBaselineFact(kind, 1);
      await refresh();
    },
    [refresh],
  );

  return { steps, hidden, loading, refresh, answer };
}

/** The estimates form's saved answers, and `save`. */
export function useEstimates() {
  const [baseline, setBaseline] = useState<Baseline | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBaseline()
      .then((b) => {
        if (!cancelled) setBaseline(b);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (estimates: Estimates) => {
    await saveEstimates(estimates);
  }, []);

  return { baseline, save };
}
