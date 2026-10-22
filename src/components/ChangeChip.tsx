import React from 'react';
import { useTranslation } from 'react-i18next';

import { Pill, type PillTone } from '@/components/Pill';

/** Within ±this many percent, a change reads as neutral rather than good or bad. */
const NEUTRAL_BAND = 10;

export interface ChangeChipProps {
  /** Whole-percent change (see `utils/percentChange`); null when there was nothing to compare with. */
  change: number | null;
  testID?: string;
}

/**
 * A spending change as a tinted chip: "+50%" in red, "−25%" in green, small
 * moves neutral, and "New" when there is no earlier figure. Spending going up is
 * the bad direction, so the tones read that way.
 */
export function ChangeChip({ change, testID }: ChangeChipProps) {
  const { t } = useTranslation();
  if (change === null) return <Pill testID={testID} label={t('change.new')} tone="warning" />;
  const tone: PillTone = change > NEUTRAL_BAND ? 'danger' : change < -NEUTRAL_BAND ? 'success' : 'neutral';
  const label = change > 0 ? `+${change}%` : change < 0 ? `−${Math.abs(change)}%` : '0%';
  return <Pill testID={testID} label={label} tone={tone} />;
}
