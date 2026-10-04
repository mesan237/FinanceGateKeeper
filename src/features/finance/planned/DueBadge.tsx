import React from 'react';
import { useTranslation } from 'react-i18next';

import { Pill, type PillTone } from '@/components/Pill';
import { formatDateLong } from '@/utils/formatDate';

import { daysUntil, dueStatus, todayISO, type DueStatus } from './planned.due';

const TONE: Record<DueStatus, PillTone> = {
  overdue: 'danger',
  today: 'warning',
  soon: 'warning',
  later: 'neutral',
};

export interface DueBadgeProps {
  /** `YYYY-MM-DD`, or null for a list made before due dates. */
  dateISO: string | null;
  testID?: string;
}

/**
 * A small chip saying when something is due: "Due 20 October 2026", "Due in 2
 * days" or "Due today" in amber, "Overdue by 3 days" in red, and "No due date"
 * for an undated list.
 */
export function DueBadge({ dateISO, testID }: DueBadgeProps) {
  const { t } = useTranslation('planned');

  if (dateISO === null) return <Pill label={t('due.none')} testID={testID} />;

  const today = todayISO();
  const status = dueStatus(dateISO, today);
  const days = daysUntil(dateISO, today);
  const label =
    status === 'overdue'
      ? t('due.overdue', { count: -days })
      : status === 'today'
        ? t('due.today')
        : status === 'soon'
          ? t('due.soon', { count: days })
          : t('due.on', { date: formatDateLong(dateISO) });

  return <Pill label={label} tone={TONE[status]} testID={testID} />;
}
