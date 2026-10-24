import React from 'react';

import { OnboardingScreen, type OnboardingScreenProps } from './OnboardingScreen';

export interface OnboardingGateProps extends OnboardingScreenProps {
  /** False while the persisted onboarding flag is still loading — render nothing. */
  ready: boolean;
  /** Whether the first-run onboarding has already been finished or skipped. */
  complete: boolean;
  children: React.ReactNode;
}

/**
 * Presentational gate for first-run set-up (VS-23, UX-08). It renders nothing
 * until the flag resolves, the set-up while onboarding is incomplete, and the
 * app otherwise. It holds no state and reads no data — the routing layer
 * injects completion and the reminder step from the auth feature and the
 * wallets step from the accounts feature, so onboarding never imports another
 * feature (mirrors the app-mode gating precedent, VS-08).
 */
export function OnboardingGate({ ready, complete, children, ...steps }: OnboardingGateProps) {
  if (!ready) return null;
  if (!complete) return <OnboardingScreen {...steps} />;
  return <>{children}</>;
}
