import type { PillTone } from '@/components/Pill';
import type { ThemeColors } from '@/theme';

import type { BudgetHealth } from './budget.types';

/**
 * How a {@link BudgetHealth} verdict is presented — a word, a chip tone, and a
 * bar colour.
 *
 * The **word is the primary signal and the colour is the reinforcement**, not
 * the other way round. Colour alone cannot be read by a colour-blind user, and
 * the pre-VS-33 budget bar leaned on hue exclusively (UX audit L5). Every
 * surface that shows a status pulls from here so the vocabulary can never drift
 * between the Budget tab, the dashboard, and the envelope rows.
 */
export interface HealthDisplay {
  /** The status word shown in the chip. */
  label: string;
  tone: PillTone;
  /** Fill colour for the matching progress bar. */
  color: string;
}

const LABELS: Record<BudgetHealth, string> = {
  on_track: 'On track',
  at_risk: 'Watch out',
  over: 'Over budget',
};

const TONES: Record<BudgetHealth, PillTone> = {
  on_track: 'success',
  at_risk: 'warning',
  over: 'danger',
};

/** Resolves a health verdict to its label, chip tone, and bar colour. */
export function healthDisplay(health: BudgetHealth, c: ThemeColors): HealthDisplay {
  const colors: Record<BudgetHealth, string> = {
    on_track: c.SUCCESS,
    at_risk: c.WARNING,
    over: c.DANGER,
  };
  return { label: LABELS[health], tone: TONES[health], color: colors[health] };
}

/** The status word on its own — for captions and accessibility labels. */
export function healthLabel(health: BudgetHealth): string {
  return LABELS[health];
}
