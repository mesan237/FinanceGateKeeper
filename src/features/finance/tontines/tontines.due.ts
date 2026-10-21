import { getTontineDetail, getTontineIds } from './tontines.service';
import type { DueContribution } from './tontines.types';

/**
 * Every unpaid contribution of every live tontine due on or before
 * `throughISO`, overdue ones included, oldest first (VS-52). With no date,
 * every unpaid contribution. Feeds the reminders and, through the approved
 * `budget → tontines` edge, committed money.
 */
export async function getDueContributions(throughISO: string = '9999-12-31'): Promise<DueContribution[]> {
  const ids = await getTontineIds();
  const details = await Promise.all(ids.map((id) => getTontineDetail(id)));
  const due: DueContribution[] = [];
  for (const tontine of details) {
    if (!tontine) continue;
    for (const cycle of tontine.cycles) {
      if (cycle.payment || cycle.dueDate > throughISO) continue;
      due.push({
        tontineId: tontine.id,
        tontineName: tontine.name,
        cycle: cycle.cycle,
        dueDate: cycle.dueDate,
        amount: tontine.contributionAmount,
      });
    }
  }
  return due.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.tontineId - b.tontineId);
}
