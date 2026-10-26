import React, { createContext, useContext, useMemo, useState } from 'react';

import { JOURNEY_STEPS } from '@/constants/journey';
import type { JourneyFigures, JourneyStepKey } from '@/types/journey';

interface JourneyStageState {
  stage: JourneyStepKey | null;
  set: (stage: JourneyStepKey) => void;
  figures: JourneyFigures | null;
  setFigures: (figures: JourneyFigures) => void;
}

const JourneyStageContext = createContext<JourneyStageState | null>(null);

/**
 * Holds the user's current journey step (UX-03) so any screen can set its
 * emphasis by it without importing the journey slice: `journey` publishes the
 * step each time it reads the path, readers only know the step key. Modelled
 * on `AttentionProvider`. The step sets emphasis, never access. Alongside the
 * step it holds the few journey figures screens lead with (UX-24).
 */
export function JourneyStageProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<JourneyStepKey | null>(null);
  const [figures, setFigures] = useState<JourneyFigures | null>(null);
  const value = useMemo(() => ({ stage, set: setStage, figures, setFigures }), [stage, figures]);
  return <JourneyStageContext.Provider value={value}>{children}</JourneyStageContext.Provider>;
}

/** The current step, or null until the journey has been read (also outside a provider). */
export function useJourneyStage(): JourneyStepKey | null {
  return useContext(JourneyStageContext)?.stage ?? null;
}

/**
 * True while the user is on a step before `step`. False while the step is
 * unknown, so a screen never flashes a preview before the journey is read.
 */
export function useIsBeforeStep(step: JourneyStepKey): boolean {
  const stage = useJourneyStage();
  if (stage === null) return false;
  return JOURNEY_STEPS.indexOf(stage) < JOURNEY_STEPS.indexOf(step);
}

/** The setter the journey slice publishes with; a no-op outside a provider. */
export function useSetJourneyStage(): (stage: JourneyStepKey) => void {
  return useContext(JourneyStageContext)?.set ?? noop;
}

/** The journey figures screens lead with by step, or null until read (UX-24). */
export function useJourneyFigures(): JourneyFigures | null {
  return useContext(JourneyStageContext)?.figures ?? null;
}

/** The setter the journey slice publishes its figures with; a no-op outside a provider. */
export function useSetJourneyFigures(): (figures: JourneyFigures) => void {
  return useContext(JourneyStageContext)?.setFigures ?? noop;
}

function noop(): void {}
