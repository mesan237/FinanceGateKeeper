import { query } from '@/services/database';

import { dueStatus, needsAttention } from './planned.due';
import type { DueItem, PlannedAttention } from './planned.types';

interface DueItemRow {
  id: number;
  list_id: number;
  list_name: string;
  name: string;
  estimated_amount: number;
  due_date: string;
}

/**
 * Every item still to buy that has a date, soonest first. Each is dated by its
 * own `planned_date`, else its list's `due_date`; undated items on lists made
 * before due dates are left out. Feeds the reminders, the drawer dot and the
 * dashboard line.
 */
export async function getDueItems(): Promise<DueItem[]> {
  const rows = await query<DueItemRow>(
    `SELECT i.id, i.list_id, l.name AS list_name, i.name, i.estimated_amount,
            COALESCE(i.planned_date, l.due_date) AS due_date
       FROM planned_items i
       JOIN planned_lists l ON l.id = i.list_id
       LEFT JOIN expenses e ON e.id = i.expense_id
      WHERE e.id IS NULL
        AND COALESCE(i.planned_date, l.due_date) IS NOT NULL
      ORDER BY due_date, i.id`,
  );
  return rows.map((r) => ({
    id: r.id,
    listId: r.list_id,
    listName: r.list_name,
    name: r.name,
    estimatedAmount: r.estimated_amount,
    dueDate: r.due_date,
  }));
}

/** Counts the due items that are due soon (incl. today) and overdue. Pure. */
export function countAttention(items: DueItem[], todayISO: string): PlannedAttention {
  let dueSoon = 0;
  let overdue = 0;
  for (const item of items) {
    const status = dueStatus(item.dueDate, todayISO);
    if (status === 'overdue') overdue += 1;
    else if (needsAttention(status)) dueSoon += 1;
  }
  return { dueSoon, overdue };
}
