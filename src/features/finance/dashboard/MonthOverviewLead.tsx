import React from 'react';
import { useTranslation } from 'react-i18next';

import { Typography } from '@/components/Typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { monthLabel } from '@/utils/monthMath';

import type { HeroNote } from './dashboard.heroLead';
import type { BudgetSummary } from './dashboard.types';

/**
 * While the hero leads with what was spent (Observe, See), a plan that exists
 * still shows, as one line: what is left in it, or how far over it is (UX-24).
 * The step sets emphasis, never access.
 */
export function PlanLeftLine({ summary }: { summary: BudgetSummary }) {
  const { t } = useTranslation('dashboard');
  const over = summary.expensesRemaining < 0;
  return (
    <Typography variant="muted" testID="month-overview-plan-left">
      {t(over ? 'month.overByLine' : 'month.planLeftLine', {
        amount: formatCurrency(Math.abs(summary.expensesRemaining)),
      })}
    </Typography>
  );
}

/** The line the journey step adds under the hero figure (UX-24): typical month, or variable spending vs the start. */
export function HeroNoteLine({ note }: { note: HeroNote }) {
  const { t } = useTranslation('dashboard');
  return (
    <Typography variant="muted" testID="month-overview-note">
      {note.kind === 'typical'
        ? t('month.typicalLine', { amount: formatCurrency(note.amount) })
        : t('month.variableLine', {
            month: monthLabel(note.month).split(' ')[0],
            latest: formatCurrency(note.latest),
            start: formatCurrency(note.start),
          })}
    </Typography>
  );
}
