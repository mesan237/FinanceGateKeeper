import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';

import { trackedWrite } from '@/services/analytics';

import { createEvent, deleteEvent, getEventDetail, getEvents, updateEvent } from './events.service';
import type { EventDetail, EventSummary, NewSpendingEvent } from './events.types';

/**
 * Hooks over events (VS-61). `refresh` is caller-driven: the screens re-read on
 * focus, because expenses are tagged from the expense screens.
 */

/** Every live event with its total, plus `create`. */
export function useEvents() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setEvents(await getEvents());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.load', { ns: 'events' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Creates an event, re-reads the list and returns the new id. */
  const create = useCallback(
    async (input: NewSpendingEvent): Promise<number> => {
      const id = await trackedWrite('event', 'create', () => createEvent(input));
      await refresh();
      return id;
    },
    [refresh],
  );

  return { events, loading, error, refresh, create };
}

/** One event's page, plus `update` and `remove`. */
export function useEventDetail(id: number) {
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDetail(await getEventDetail(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.load', { ns: 'events' }));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: NewSpendingEvent) => {
      await trackedWrite('event', 'edit', () => updateEvent(id, patch));
      await refresh();
    },
    [id, refresh],
  );

  const remove = useCallback(() => trackedWrite('event', 'delete', () => deleteEvent(id)), [id]);

  return { detail, loading, error, refresh, update, remove };
}
