import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';

import { markBought, unmarkBought, type PurchaseDetails } from './planned.purchase';
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

  const create = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        await service.createList(name);
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
  const [items, setItems] = useState<PlannedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [lists, rows] = await Promise.all([service.getLists(), service.getItems(listId)]);
      setListName(lists.find((l) => l.id === listId)?.name ?? null);
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

  /** Deletes the whole list; resolves `true` when it is gone. */
  const removeList = useCallback(async (): Promise<boolean> => {
    try {
      await service.deleteList(listId);
      return true;
    } catch (e) {
      setError(messageOf(e, i18n.t('errors.save', { ns: 'planned' })));
      return false;
    }
  }, [listId]);

  return { listName, items, loading, error, refresh, add, update, remove, buy, unbuy, removeList };
}
