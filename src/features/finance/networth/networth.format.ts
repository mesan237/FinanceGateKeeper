import i18n from 'i18next';

import { formatCurrency } from '@/utils/formatCurrency';
import { monthLabel } from '@/utils/monthMath';

import type { NetWorth } from './networth.types';

/** A change in FCFA with an explicit sign: "+20 000 FCFA", "−5 000 FCFA", "0 FCFA". */
export function signedAmount(change: number): string {
  if (change > 0) return `+${formatCurrency(change)}`;
  if (change < 0) return `−${formatCurrency(-change)}`;
  return formatCurrency(0);
}

/** "Wallets X · Lent Y · Owed −Z · Tontines W" — wallets always, other parts only when non-zero. */
export function partsLine(worth: NetWorth): string {
  const parts = (['wallets', 'lent', 'owed', 'tontines'] as const).filter(
    (part) => part === 'wallets' || worth[part] !== 0,
  );
  return parts
    .map((part) => i18n.t(`parts.${part}`, { ns: 'networth', amount: formatCurrency(worth[part]) }))
    .join(' · ');
}

/** One month's savings-rate sentence: kept, spent more than came in, or no income. */
export function savingsLine(monthISO: string, rate: number | null): string {
  const month = monthLabel(monthISO);
  if (rate === null) return i18n.t('savings.monthNone', { ns: 'networth', month });
  if (rate < 0) return i18n.t('savings.monthOver', { ns: 'networth', month, rate: -rate });
  return i18n.t('savings.month', { ns: 'networth', month, rate });
}
