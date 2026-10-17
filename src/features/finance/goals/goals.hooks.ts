import i18n from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccounts } from '@/features/finance/accounts/accounts.hooks';
import { toISODate } from '@/utils/formatDate';

import { goalProgress } from './goals.progress';
import {
  createGoal,
  deleteGoal,
  getEssentialsEstimate,
  getGoalById,
  getGoals,
  updateGoal,
} from './goals.service';
import type { GoalKind, GoalWithProgress, NewGoal } from './goals.types';

/** Message of a thrown error, else the localised fallback `key`. */
function messageOf(e: unknown, key: 'loadGoals' | 'saveFailed' | 'deleteFailed'): string {
  return e instanceof Error ? e.message : i18n.t(`errors.${key}`, { ns: 'goals' });
}

/**
 * Loads every live goal with its progress. `refresh` is caller-driven so the
 * list can re-read on focus — saving happens on the transfer screen.
 */
export function useGoals() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setGoals(await getGoals());
      setError(null);
    } catch (e) {
      setError(messageOf(e, 'loadGoals'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { goals, loading, error, refresh };
}

/**
 * Drives the goal form, for a new goal or, with `goalId`, an existing one.
 *
 * Amounts are digit strings as typed. The suggestions are computed here so the
 * form only renders them: one month of essentials as a buffer's target (from
 * the VS-46 estimate), and the monthly amount a sinking fund needs to arrive on
 * time given what its wallet already holds.
 */
export function useGoalForm(goalId?: number) {
  const { balances } = useAccounts();
  const [kind, setKind] = useState<GoalKind>('buffer');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [monthly, setMonthly] = useState('');
  const [essentials, setEssentials] = useState<number | null>(null);
  const [loading, setLoading] = useState(goalId !== undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [estimate, existing] = await Promise.all([
          getEssentialsEstimate(),
          goalId === undefined ? Promise.resolve(null) : getGoalById(goalId),
        ]);
        if (!active) return;
        setEssentials(estimate);
        if (goalId !== undefined && !existing) setError(i18n.t('errors.notFound', { ns: 'goals' }));
        if (existing) {
          setKind(existing.kind);
          setName(existing.name);
          setTarget(String(existing.targetAmount));
          setTargetDate(existing.targetDate ?? '');
          setAccountId(existing.accountId);
          setMonthly(existing.monthlyAmount > 0 ? String(existing.monthlyAmount) : '');
        }
      } catch (e) {
        if (active) setError(messageOf(e, 'loadGoals'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [goalId]);

  const targetAmount = Number(target);
  const monthlyAmount = monthly === '' ? 0 : Number(monthly);
  const hasDate = kind === 'buffer' || targetDate !== '';
  const canSubmit =
    !saving && name.trim() !== '' && targetAmount > 0 && accountId !== null && hasDate;

  /** The monthly amount a sinking fund needs, from the chosen wallet's balance. */
  const neededMonthly = useMemo(() => {
    if (kind !== 'sinking' || targetDate === '' || accountId === null || !(targetAmount > 0)) return null;
    const draft = { id: 0, name, kind, targetAmount, targetDate, accountId, monthlyAmount, createdAt: '' };
    const needed = goalProgress(draft, balances[accountId] ?? 0, 0, toISODate(new Date())).requiredMonthly;
    return needed && needed > 0 ? needed : null;
  }, [kind, targetDate, accountId, targetAmount, name, monthlyAmount, balances]);

  /** Validates and saves; resolves true when the write landed. */
  const save = useCallback(async (): Promise<boolean> => {
    if (!canSubmit || accountId === null) return false;
    setSaving(true);
    const input: NewGoal = { name, kind, targetAmount, targetDate: targetDate || null, accountId, monthlyAmount };
    try {
      if (goalId === undefined) await createGoal(input);
      else await updateGoal(goalId, input);
      return true;
    } catch (e) {
      setError(messageOf(e, 'saveFailed'));
      setSaving(false);
      return false;
    }
  }, [canSubmit, accountId, name, kind, targetAmount, targetDate, monthlyAmount, goalId]);

  /** Deletes the goal being edited; resolves true when it is gone. */
  const remove = useCallback(async (): Promise<boolean> => {
    if (goalId === undefined) return false;
    try {
      await deleteGoal(goalId);
      return true;
    } catch (e) {
      setError(messageOf(e, 'deleteFailed'));
      return false;
    }
  }, [goalId]);

  return {
    isEditing: goalId !== undefined,
    loading,
    saving,
    error,
    kind,
    setKind,
    name,
    setName,
    target,
    setTarget,
    targetDate,
    setTargetDate,
    accountId,
    setAccountId,
    monthly,
    setMonthly,
    essentials,
    neededMonthly,
    canSubmit,
    save,
    remove,
  };
}
