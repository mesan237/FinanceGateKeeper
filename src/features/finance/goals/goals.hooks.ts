import i18n from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccounts } from '@/features/finance/accounts/accounts.hooks';
import { trackedWrite } from '@/services/analytics';
import { toISODate } from '@/utils/formatDate';

import { goalProgress } from './goals.progress';
import {
  createGoal,
  deleteGoal,
  getEssentialMonthly,
  getEssentialsEstimate,
  getGoalById,
  getGoals,
  updateGoal,
} from './goals.service';
import type { EssentialMonthly, GoalKind, GoalWithProgress, NewGoal } from './goals.types';

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
 * time given what its wallet already holds. A reserve (VS-50) has no typed
 * target: its size is `months × essentials`, shown live as the months change.
 */
export function useGoalForm(goalId?: number) {
  const { balances } = useAccounts();
  const [kind, setKind] = useState<GoalKind>('buffer');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [monthly, setMonthly] = useState('');
  const [months, setMonths] = useState(3);
  const [essentials, setEssentials] = useState<number | null>(null);
  const [essentialMonthly, setEssentialMonthly] = useState<EssentialMonthly | null>(null);
  const [loading, setLoading] = useState(goalId !== undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [estimate, monthlyEssentials, existing] = await Promise.all([
          getEssentialsEstimate(),
          getEssentialMonthly(),
          goalId === undefined ? Promise.resolve(null) : getGoalById(goalId),
        ]);
        if (!active) return;
        setEssentials(estimate);
        setEssentialMonthly(monthlyEssentials);
        if (goalId !== undefined && !existing) setError(i18n.t('errors.notFound', { ns: 'goals' }));
        if (existing) {
          setKind(existing.kind);
          setName(existing.name);
          setTarget(String(existing.targetAmount));
          setTargetDate(existing.targetDate ?? '');
          setAccountId(existing.accountId);
          setMonthly(existing.monthlyAmount > 0 ? String(existing.monthlyAmount) : '');
          if (existing.targetMonths !== null) setMonths(existing.targetMonths);
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

  const isReserve = kind === 'reserve';
  /** A reserve's live size; null until essentials are known. */
  const reserveSize =
    isReserve && essentialMonthly?.amount != null ? months * essentialMonthly.amount : null;
  const targetAmount = isReserve ? (reserveSize ?? 0) : Number(target);
  const monthlyAmount = monthly === '' ? 0 : Number(monthly);
  const hasDate = kind !== 'sinking' || targetDate !== '';
  const canSubmit =
    !saving && name.trim() !== '' && targetAmount > 0 && accountId !== null && hasDate;

  /** The monthly amount a sinking fund needs, from the chosen wallet's balance. */
  const neededMonthly = useMemo(() => {
    if (kind !== 'sinking' || targetDate === '' || accountId === null || !(targetAmount > 0)) return null;
    const draft = { id: 0, name, kind, targetAmount, targetDate, accountId, monthlyAmount, targetMonths: null, createdAt: '' };
    const needed = goalProgress(draft, balances[accountId] ?? 0, 0, toISODate(new Date())).requiredMonthly;
    return needed && needed > 0 ? needed : null;
  }, [kind, targetDate, accountId, targetAmount, name, monthlyAmount, balances]);

  /** Validates and saves; resolves true when the write landed. */
  const save = useCallback(async (): Promise<boolean> => {
    if (!canSubmit || accountId === null) return false;
    setSaving(true);
    const input: NewGoal = {
      name,
      kind,
      targetAmount,
      targetDate: kind === 'sinking' ? targetDate || null : null,
      targetMonths: isReserve ? months : null,
      accountId,
      monthlyAmount,
    };
    try {
      if (goalId === undefined) await trackedWrite('goal', 'create', () => createGoal(input));
      else await trackedWrite('goal', 'edit', () => updateGoal(goalId, input));
      return true;
    } catch (e) {
      setError(messageOf(e, 'saveFailed'));
      setSaving(false);
      return false;
    }
  }, [canSubmit, accountId, name, kind, targetAmount, targetDate, isReserve, months, monthlyAmount, goalId]);

  /** Deletes the goal being edited; resolves true when it is gone. */
  const remove = useCallback(async (): Promise<boolean> => {
    if (goalId === undefined) return false;
    try {
      await trackedWrite('goal', 'delete', () => deleteGoal(goalId));
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
    months,
    setMonths,
    essentials,
    essentialMonthly,
    reserveSize,
    neededMonthly,
    canSubmit,
    save,
    remove,
  };
}
