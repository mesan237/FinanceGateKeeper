import i18n from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { trackedWrite } from '@/services/analytics';

import type { IncomeSource } from './income.types';
import * as service from './incomeSources.service';

/**
 * The income sources (VS-91), hidden ones included, with the writes the picker
 * and the manage screen need. Each write reloads the list; a refused write
 * (empty or taken name) leaves the service's message in `error` and resolves
 * to null / false so a form can stay open.
 */
export function useIncomeSources() {
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setSources(await service.getIncomeSources());
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.loadFailed', { ns: 'income' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const topLevel = useMemo(() => sources.filter((s) => s.parentId === null), [sources]);

  const subsourcesOf = useCallback(
    (parentId: number) => sources.filter((s) => s.parentId === parentId),
    [sources],
  );

  const byId = useCallback((id: number) => sources.find((s) => s.id === id) ?? null, [sources]);

  /** Runs a write, then reloads; false (with `error` set) when it was refused. */
  const run = useCallback(
    async (write: () => Promise<unknown>): Promise<boolean> => {
      try {
        await write();
        setError(null);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : i18n.t('errors.sourceSaveFailed', { ns: 'income' }));
        return false;
      } finally {
        await reload();
      }
    },
    [reload],
  );

  /** Adds a source (under `parentId`, or top-level). Returns its id, or null when refused. */
  const create = useCallback(
    async (name: string, parentId: number | null): Promise<number | null> => {
      let id: number | null = null;
      const ok = await run(async () => {
        id = await trackedWrite('income_source', 'create', () => service.createIncomeSource(name, parentId));
      });
      return ok ? id : null;
    },
    [run],
  );

  /** Renames a source the user made. Returns false when refused. */
  const rename = useCallback(
    (id: number, name: string) =>
      run(() => trackedWrite('income_source', 'edit', () => service.renameIncomeSource(id, name))),
    [run],
  );

  /** Hides a visible source, or shows a hidden one again (an `edit` for analytics). */
  const toggleHidden = useCallback(
    (source: IncomeSource) =>
      run(() =>
        trackedWrite('income_source', source.isHidden ? 'edit' : 'hide', () =>
          service.setIncomeSourceHidden(source.id, !source.isHidden),
        ),
      ),
    [run],
  );

  /** Clears a refused write's message (e.g. when its form closes). */
  const clearError = useCallback(() => setError(null), []);

  return { sources, topLevel, subsourcesOf, byId, loading, error, clearError, create, rename, toggleHidden, reload };
}
