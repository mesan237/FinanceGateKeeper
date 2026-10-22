import i18n from 'i18next';

import type { events as eventsCopy } from '@/i18n/locales/en/events';
import { execute, query } from '@/services/database';

import type {
  EventDetail,
  EventExpense,
  EventSummary,
  NewSpendingEvent,
  SpendingEvent,
} from './events.types';

/**
 * Event storage (VS-61). An event is a name and an optional date; expenses point
 * at it through `expenses.event_id` (written by the expenses slice). Events
 * soft-delete, because the sync engine never sends deletions. Deleting one frees
 * its expenses rather than removing them: the money was still spent.
 */

interface EventRow {
  id: number;
  name: string;
  date: string | null;
  created_at: string;
}

type EventErrorKey = keyof (typeof eventsCopy)['errors'];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A validation error in the active UI language. */
function err(key: EventErrorKey): Error {
  return new Error(i18n.t(`errors.${key}`, { ns: 'events' }));
}

function mapEvent(row: EventRow): SpendingEvent {
  return { id: row.id, name: row.name, date: row.date, createdAt: row.created_at };
}

/** Trims and checks a name; throws when it is empty. */
function assertName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') throw err('nameRequired');
  return trimmed;
}

/** Throws unless `date` is null or `YYYY-MM-DD`. */
function assertDate(date: string | null): void {
  if (date !== null && !ISO_DATE.test(date)) throw err('dateFormat');
}

/** Creates an event and returns its id. @throws on an empty name or a malformed date. */
export async function createEvent(input: NewSpendingEvent): Promise<number> {
  const name = assertName(input.name);
  assertDate(input.date);
  await execute('INSERT INTO events (name, date, created_at) VALUES (?, ?, ?)', [
    name,
    input.date,
    new Date().toISOString(),
  ]);
  const [row] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row.id;
}

/** Renames an event or changes its date. @throws on an empty name or a malformed date. */
export async function updateEvent(id: number, patch: Partial<NewSpendingEvent>): Promise<void> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    params.push(assertName(patch.name));
  }
  if (patch.date !== undefined) {
    assertDate(patch.date);
    sets.push('date = ?');
    params.push(patch.date);
  }
  if (sets.length === 0) return;
  params.push(id);
  await execute(`UPDATE events SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params);
}

/** Soft-deletes an event and frees the expenses tagged with it; they keep their amounts. */
export async function deleteEvent(id: number): Promise<void> {
  await execute('UPDATE expenses SET event_id = NULL WHERE event_id = ?', [id]);
  await execute('UPDATE events SET deleted_at = ? WHERE id = ?', [new Date().toISOString(), id]);
}

/**
 * Every live event with what it cost (refunds netted) and how many purchases it
 * holds, newest first: by its date, or by the day it was created when it has none.
 */
export async function getEvents(): Promise<EventSummary[]> {
  const rows = await query<EventRow & { total: number; count: number }>(
    `SELECT ev.id, ev.name, ev.date, ev.created_at,
            COALESCE(SUM(e.amount), 0) AS total,
            COUNT(CASE WHEN e.id IS NOT NULL AND e.refund_of IS NULL THEN 1 END) AS count
       FROM events ev
       LEFT JOIN expenses e ON e.event_id = ev.id
      WHERE ev.deleted_at IS NULL
      GROUP BY ev.id
      ORDER BY COALESCE(ev.date, substr(ev.created_at, 1, 10)) DESC, ev.id DESC`,
  );
  return rows.map((r) => ({ ...mapEvent(r), total: r.total, count: r.count }));
}

/** The event page's data, or null when the event does not exist or was deleted. */
export async function getEventDetail(id: number): Promise<EventDetail | null> {
  const [row] = await query<EventRow>(
    'SELECT id, name, date, created_at FROM events WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  if (!row) return null;

  const expenses = await query<{
    id: number;
    amount: number;
    date: string;
    note: string | null;
    category_id: number;
    category_label: string;
    subcategory_label: string | null;
    refund_of: number | null;
  }>(
    `SELECT e.id, e.amount, e.date, e.note, e.category_id, c.name AS category_label,
            sc.name AS subcategory_label, e.refund_of
       FROM expenses e
       JOIN categories c ON c.id = e.category_id
       LEFT JOIN categories sc ON sc.id = e.subcategory_id
      WHERE e.event_id = ?
      ORDER BY e.date DESC, e.id DESC`,
    [id],
  );

  const byCategory = new Map<number, { categoryId: number; categoryLabel: string; amount: number }>();
  for (const e of expenses) {
    const part = byCategory.get(e.category_id) ?? { categoryId: e.category_id, categoryLabel: e.category_label, amount: 0 };
    part.amount += e.amount;
    byCategory.set(e.category_id, part);
  }

  return {
    event: mapEvent(row),
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    byCategory: [...byCategory.values()].filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount),
    expenses: expenses.map(
      (e): EventExpense => ({
        id: e.id,
        amount: e.amount,
        date: e.date,
        note: e.note,
        categoryLabel: e.category_label,
        subcategoryLabel: e.subcategory_label,
        refundOf: e.refund_of,
      }),
    ),
  };
}
