import React from 'react';

import { OnboardingScreen } from './OnboardingScreen';

export interface OnboardingGateProps {
  /** False while the persisted onboarding flag is still loading — render nothing. */
  ready: boolean;
  /** Whether the first-run onboarding has already been finished or skipped. */
  complete: boolean;
  /** Persists completion; wired by the routing layer to the auth feature. */
  onDone: () => void;
  children: React.ReactNode;
}

/**
 * Presentational gate for the first-run onboarding carousel (VS-23). It renders
 * nothing until the flag resolves, the carousel while onboarding is incomplete,
 * and the app otherwise. It holds no state and reads no data — the routing layer
 * injects `ready`/`complete`/`onDone` from the auth feature, so onboarding never
 * imports another feature (mirrors the app-mode gating precedent, VS-08).
 */
export function OnboardingGate({ ready, complete, onDone, children }: OnboardingGateProps) {
  if (!ready) return null;
  if (!complete) return <OnboardingScreen onDone={onDone} />;
  return <>{children}</>;
}
