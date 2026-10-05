import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useSetAttention } from '@/components/AttentionProvider';
import { ATTENTION_PLANNED } from '@/constants/attention';

import { effectiveDueDate, postponedDate, todayISO } from './planned.due';
import { notifyPlannedChange, onPlannedChange } from './planned.events';
import { markBought, unmarkBought, type PurchaseDetails } from './planned.purchase';
import { reconcilePlannedReminders } from './planned.reminders';
import * as service from './planned.service';
import type {
  NewPlannedItem,
  PlannedItem,
  PlannedItemPatch,
  PlannedList,
} from './planned.types';

/** The message to show for a failed call: the thrown validation message, else `fallback`. */
function messageOf(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/**
 * Loads every shopping list with its open-item summary, and exposes the list
 * mutations. Each mutation re-reads afterwards and resolves `true` on success;
 * on failure it sets `error` and resolves `false`, so a form can stay open.
 */
export function usePlannedLists() {
  const [lists, setLists] = useState<PlannedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLists(await service.getLists());
      setError(null);
    } catch (e) {
      setError(messageOf(e, i18n.t('errors.load', { ns: 'planned' })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // A due date moved or an item bought inside a list shows here on the way back.
  useEffect(() => onPlannedChange(() => void refresh()), [refresh]);

  const create = useCallback(
    async (name: string, dueDate: string): Promise<boolean> => {
      try {
        await service.createList(name, dueDate);
        notifyPlannedChange();
        await refresh();
        return true;
      } catch (e) {
        setError(messageOf(e, i18n.t('errors.save', { ns: 'planned' })));
        return false;
      }
    },
    [refresh],
  );

  return { lists, loading, error, refresh, create };
}

/**
 * Loads one list's items (bought state read live from the expenses) and exposes
 * the item mutations, including ticking an item into an expense (`buy`) and
 * undoing that (`unbuy`). Mutations resolve `true` on success; on failure they
 * set `error` and resolve `false`.
 */
export function usePlannedItems(listId: number) {
  const [listName, setListName] = useState<string | null>(null);
  const [listDueDate, setListDueDate] = useState<string | null>(null);
  const [items, setItems] = useState<PlannedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [lists, rows] = await Promise.all([service.getLists(), service.getItems(listId)]);
      const list = lists.find((l) => l.id === listId);
      setListName(list?.name ?? null);
      setListDueDate(list?.dueDate ?? null);
      setItems(rows);
      setError(null);
    } catch (e) {
      setError(messageOf(e, i18n.t('errors.load', { ns: 'planned' })));
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Runs a mutation, then re-reads; maps a thrown error to `error` + `false`. */
  const mutate = useCallback(
    async (work: () => Promise<unknown>): Promise<boolean> => {
      try {
        await work();
        notifyPlannedChange();
        await refresh();
        return true;
      } catch (e) {
        setError(messageOf(e, i18n.t('errors.save', { ns: 'planned' })));
        return false;
      }
    },
    [refresh],
  );

  const add = useCallback(
    (input: Omit<NewPlannedItem, 'listId'>) => mutate(() => service.createItem({ ...input, listId })),
    [mutate, listId],
  );
  const update = useCallback(
    (id: number, patch: PlannedItemPatch) => mutate(() => service.updateItem(id, patch)),
    [mutate],
  );
  const remove = useCallback((id: number) => mutate(() => service.deleteItem(id)), [mutate]);
  const buy = useCallback(
    (id: number, details: PurchaseDetails) => mutate(() => markBought(id, details)),
    [mutate],
  );
  const unbuy = useCallback((id: number) => mutate(() => unmarkBought(id)), [mutate]);
  /** Moves the whole list to a new due date. */
  const setDueDate = useCallback(
    (dueDate: string) => mutate(() => service.setListDueDate(listId, dueDate)),
    [mutate, listId],
  );
  /**
   * Postpones one item by `days`, from its current date (or today, once that
   * has passed). The new date is the item's own, so the rest of the list keeps
   * the list's date.
   */
  const postpone = useCallback(
    (item: PlannedItem, days: number) => {
      const today = todayISO();
      const current = effectiveDueDate(item.plannedDate, listDueDate) ?? today;
      return mutate(() =>
        service.updateItem(item.id, { plannedDate: postponedDate(current, today, days) }),
      );
    },
    [mutate, listDueDate],
  );
  /** Dismisses the last failure, e.g. when a sheet is opened or closed. */
  const clearError = useCallback(() => setError(null), []);

  /** Deletes the whole list; resolves `true` when it is gone. */
  const removeList = useCallback(async (): Promise<boolean> => {
    try {
      await service.deleteList(listId);
      notifyPlannedChange();
      return true;
    } catch (e) {
      setError(messageOf(e, i18n.t('errors.save', { ns: 'planned' })));
      return false;
    }
  }, [listId]);

  return {
    listName,
    listDueDate,
    items,
    loading,
    error,
    refresh,
    clearError,
    add,
    update,
    remove,
    buy,
    unbuy,
    setDueDate,
    postpone,
    removeList,
  };
}

/**
 * Keeps the planned-purchase reminders and the drawer/dashboard attention
 * counts current: re-plans on mount, whenever a list or item changes, and when
 * the app returns to the foreground (the day may have turned since). Failures
 * — no notification permission, say — leave the app running untouched.
 */
export function usePlannedReminders(): void {
  const setAttention = useSetAttention();

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const { dueSoon, overdue } = await reconcilePlannedReminders();
        if (active) setAttention(ATTENTION_PLANNED, { soon: dueSoon, overdue });
      } catch {
        // Reminders are a convenience; the lists themselves still work.
      }
    };

    void run();
    const unsubscribe = onPlannedChange(() => void run());
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
