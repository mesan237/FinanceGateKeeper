import { useCallback, useEffect, useState } from 'react';

import { getMonthlyBudget } from '@/features/finance/budget/budget.service';
import { currentMonthISO } from '@/utils/formatDate';

import * as projectsService from './projects.service';
import type {
  DeletedProject,
  Project,
  ProjectPatch,
  ProjectStatus,
  ProjectTransaction,
  TimelineEstimate,
} from './projects.types';

/**
 * Loads the priority-ranked projects and derives each one's timeline from the
 * current month's project funding rate (`getMonthlyBudget(month).breakdown.projects`
 * — `projects → budget` is approved). Exposes `reorder`, which persists a new
 * priority order and re-fetches. Errors are swallowed into `error`, mirroring
 * the other slices' hooks.
 */
export function useProjects(monthISO: string = currentMonthISO()) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timelines, setTimelines] = useState<TimelineEstimate[]>([]);
  const [monthlyRate, setMonthlyRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Self-empty the recycle bin: drop anything past its recovery window
      // before reading the active list.
      await projectsService.purgeExpiredProjects();
      const [rows, budget] = await Promise.all([
        projectsService.getProjects(),
        getMonthlyBudget(monthISO),
      ]);
      const rate = budget.breakdown.projects;
      setProjects(rows);
      setMonthlyRate(rate);
      setTimelines(rows.map((p) => projectsService.estimateTimeline(p, rate)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, [monthISO]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reorder = useCallback(
    async (orderedIds: number[]): Promise<void> => {
      try {
        await projectsService.reorderPriority(orderedIds);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to reorder projects.');
      }
    },
    [refresh],
  );

  return { projects, timelines, monthlyRate, loading, error, refresh, reorder };
}

/**
 * Loads a single project and its contribution history, and exposes mutations
 * (`update` via status/contribution) that re-fetch on success.
 */
export function useProjectDetail(id: number) {
  const [project, setProject] = useState<Project | null>(null);
  const [transactions, setTransactions] = useState<ProjectTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [row, txns] = await Promise.all([
        projectsService.getProjectById(id),
        projectsService.getProjectTransactions(id),
      ]);
      setProject(row);
      setTransactions(txns);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setStatus = useCallback(
    async (status: ProjectStatus): Promise<void> => {
      try {
        await projectsService.setStatus(id, status);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update status.');
      }
    },
    [id, refresh],
  );

  const contribute = useCallback(
    async (amount: number, accountId: number | null = null): Promise<void> => {
      try {
        await projectsService.contributeManually(id, amount, undefined, accountId);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to contribute.');
      }
    },
    [id, refresh],
  );

  const update = useCallback(
    async (patch: ProjectPatch): Promise<boolean> => {
      try {
        await projectsService.updateProject(id, patch);
        await refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update project.');
        return false;
      }
    },
    [id, refresh],
  );

  // Hard-deletes the project. Returns whether it succeeded so the screen can
  // navigate back only on success (no refresh — the row is gone).
  const remove = useCallback(async (): Promise<boolean> => {
    try {
      await projectsService.deleteProject(id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project.');
      return false;
    }
  }, [id]);

  return { project, transactions, loading, error, refresh, setStatus, contribute, update, remove };
}

/**
 * Loads the recycle bin — projects soft-deleted within the recovery window —
 * and exposes `restore`. Purges anything already expired on each load so the
 * list never shows projects that are about to vanish.
 */
export function useDeletedProjects() {
  const [deleted, setDeleted] = useState<DeletedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await projectsService.purgeExpiredProjects();
      setDeleted(await projectsService.getDeletedProjects());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load deleted projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const restore = useCallback(
    async (id: number): Promise<void> => {
      try {
        await projectsService.restoreProject(id);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to restore project.');
      }
    },
    [refresh],
  );

  return { deleted, loading, error, refresh, restore };
}
