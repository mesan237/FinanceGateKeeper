import type { PinState } from './auth.types';

/** What the PIN gate shows: nothing yet, the PIN screen, or the app (set-up included). */
export type PinGateView = 'wait' | 'lock' | 'app';

export interface PinGateInput {
  /** Whether the PIN lock state has resolved. */
  ready: boolean;
  pinState: PinState;
  /** Whether the first-run set-up is done; `undefined` while it is still loading. */
  setUpComplete: boolean | undefined;
}

/**
 * Decides what the root PIN gate shows (VS-85). A first run walks through the
 * set-up before any PIN is asked for, so the user knows what the app is and
 * has something worth protecting; the PIN is then created as the last step.
 * An existing PIN always locks first, before the set-up or the app.
 */
export function pinGateView({ ready, pinState, setUpComplete }: PinGateInput): PinGateView {
  if (!ready) return 'wait';
  if (pinState === 'unlocked') return 'app';
  if (pinState === 'locked') return 'lock';
  if (setUpComplete === undefined) return 'wait';
  return setUpComplete ? 'lock' : 'app';
}
