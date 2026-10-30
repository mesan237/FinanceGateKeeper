import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useSetAttention } from '@/components/AttentionProvider';
import { ATTENTION_TONTINES } from '@/constants/attention';

import { useDefaultAccountId } from '@/features/finance/accounts/accounts.hooks';
import { trackedWrite } from '@/services/analytics';
import { toISODate } from '@/utils/formatDate';

import { onTontineChange } from './tontines.events';
import { reconcileTontineReminders } from './tontines.reminders';
import {
  createTontine,
  deleteTontine,
  getTontineDetail,
  getTontines,
  payContribution,
  recordPayout,
  removePayment,
  updateTontine,
} from './tontines.service';
import type { NewTontine, TontineDetail, TontineFrequency, TontineWithSummary } from './tontines.types';

type ErrorKey = 'loadTontines' | 'saveFailed' | 'deleteFailed' | 'paymentFailed';

/** Message of a thrown error, else the localised fallback `key`. */
function messageOf(e: unknown, key: ErrorKey): string {
  return e instanceof Error ? e.message : i18n.t(`errors.${key}`, { ns: 'tontines' });
}

/** Every live tontine with its summary. `refresh` is caller-driven (re-read on focus). */
export function useTontines() {
  const [tontines, setTontines] = useState<TontineWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTontines(await getTontines());
      setError(null);
    } catch (e) {
      setError(messageOf(e, 'loadTontines'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { tontines, loading, error, refresh };
}

/**
 * One tontine with its schedule, and the three things the user does to it:
 * tick a contribution paid, record the payout, undo either. Each action
 * re-reads the tontine and resolves true when the write landed.
 */
export function useTontineDetail(tontineId: number) {
  const [tontine, setTontine] = useState<TontineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTontine(await getTontineDetail(tontineId));
      setError(null);
    } catch (e) {
      setError(messageOf(e, 'loadTontines'));
    } finally {
      setLoading(false);
    }
  }, [tontineId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (write: () => Promise<void>): Promise<boolean> => {
      try {
        await write();
        await refresh();
        return true;
      } catch (e) {
        setError(messageOf(e, 'paymentFailed'));
        return false;
      }
    },
    [refresh],
  );

  /** Ticks `cycle` paid through `accountId` on `date`. */
  const pay = useCallback(
    (cycle: number, accountId: number | null, date: string) =>
      run(() => trackedWrite('tontine_payment', 'pay', () => payContribution(tontineId, cycle, accountId, date))),
    [run, tontineId],
  );

  /** Records the payout of `amount` into `accountId` on `date`. */
  const payout = useCallback(
    (amount: number, accountId: number | null, date: string) =>
      run(() => trackedWrite('tontine_payment', 'payout', () => recordPayout(tontineId, amount, accountId, date))),
    [run, tontineId],
  );

  /** Removes a contribution or the payout. */
  const remove = useCallback(
    (paymentId: number) => run(() => trackedWrite('tontine_payment', 'delete', () => removePayment(paymentId))),
    [run],
  );

  return { tontine, loading, error, refresh, pay, payout, remove };
}

/**
 * Drives the tontine form, for a new tontine or, with `tontineId`, an existing
 * one. Numbers are typed as digit strings; the payout turn may stay blank
 * until the draw. The wallet follows the default wallet until changed.
 */
export function useTontineForm(tontineId?: number) {
  const defaultAccountId = useDefaultAccountId();
  const [name, setName] = useState('');
  const [contribution, setContribution] = useState('');
  const [frequency, setFrequency] = useState<TontineFrequency>('weekly');
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [members, setMembers] = useState('');
  const [turn, setTurn] = useState('');
  const [chosenAccountId, setAccountId] = useState<number | null | undefined>(undefined);
  const [loading, setLoading] = useState(tontineId !== undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accountId = chosenAccountId === undefined ? defaultAccountId : chosenAccountId;

  useEffect(() => {
    if (tontineId === undefined) return;
    let active = true;
    void (async () => {
      try {
        const existing = await getTontineDetail(tontineId);
        if (!active) return;
        if (!existing) {
          setError(i18n.t('errors.notFound', { ns: 'tontines' }));
          return;
        }
        setName(existing.name);
        setContribution(String(existing.contributionAmount));
        setFrequency(existing.frequency);
        setStartDate(existing.startDate);
        setMembers(String(existing.members));
        setTurn(existing.payoutTurn === null ? '' : String(existing.payoutTurn));
        setAccountId(existing.accountId);
      } catch (e) {
        if (active) setError(messageOf(e, 'loadTontines'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tontineId]);

  const canSubmit = !saving && name.trim() !== '' && Number(contribution) > 0 && Number(members) > 0;

  /** Validates and saves; resolves the tontine's id, or null when refused. */
  const save = useCallback(async (): Promise<number | null> => {
    if (!canSubmit) return null;
    setSaving(true);
    const input: NewTontine = {
      name,
      contributionAmount: Number(contribution),
      frequency,
      startDate,
      members: Number(members),
      payoutTurn: turn === '' ? null : Number(turn),
      accountId: accountId ?? null,
    };
    try {
      if (tontineId === undefined) return await trackedWrite('tontine', 'create', () => createTontine(input));
      await trackedWrite('tontine', 'edit', () => updateTontine(tontineId, input));
      return tontineId;
    } catch (e) {
      setError(messageOf(e, 'saveFailed'));
      setSaving(false);
      return null;
    }
  }, [canSubmit, name, contribution, frequency, startDate, members, turn, accountId, tontineId]);

  /** Deletes the tontine being edited; resolves true when it is gone. */
  const remove = useCallback(async (): Promise<boolean> => {
    if (tontineId === undefined) return false;
    try {
      await trackedWrite('tontine', 'delete', () => deleteTontine(tontineId));
      return true;
    } catch (e) {
      setError(messageOf(e, 'deleteFailed'));
      return false;
    }
  }, [tontineId]);

  return {
    isEditing: tontineId !== undefined,
    loading,
    saving,
    error,
    name,
    setName,
    contribution,
    setContribution,
    frequency,
    setFrequency,
    startDate,
    setStartDate,
    members,
    setMembers: (value: string) => setMembers(value.replace(/\D/g, '')),
    turn,
    setTurn: (value: string) => setTurn(value.replace(/\D/g, '')),
    accountId,
    setAccountId,
    canSubmit,
    save,
    remove,
  };
}

/**
 * Keeps the tontine reminders and the drawer dot's counts up to date (VS-52):
 * re-plans on mount, after any tontine or payment change, and whenever the app
 * returns to the foreground, since the day may have changed.
 */
export function useTontineReminders(): void {
  const setAttention = useSetAttention();

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const counts = await reconcileTontineReminders();
        if (active) setAttention(ATTENTION_TONTINES, counts);
      } catch {
        // Reminders are a convenience; the tontines themselves still work.
      }
    };

    void run();
    const unsubscribe = onTontineChange(() => void run());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });
    return () => {
      active = false;
      unsubscribe();
      subscription.remove();
    };
  }, [setAttention]);
}
