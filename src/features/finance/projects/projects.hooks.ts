import { useCallback, useEffect, useState } from 'react';

import { getMonthlyBudget } from '@/features/finance/budget/budget.service';
import { currentMonthISO } from '@/utils/formatDate';

import * as projectsService from './projects.service';
import type { Project, ProjectStatus, ProjectTransaction, TimelineEstimate } from './projects.types';

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
    async (amount: number): Promise<void> => {
      try {
        await projectsService.contributeManually(id, amount);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to contribute.');
      }
    },
    [id, refresh],
  );

  return { project, transactions, loading, error, refresh, setStatus, contribute };
}
