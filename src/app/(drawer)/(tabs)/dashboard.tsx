import React from 'react';

import { useAppMode } from '@/features/finance/auth/AppModeProvider';
import { useAppSettings } from '@/features/finance/auth/auth.hooks';
import { DashboardScreen } from '@/features/finance/dashboard/DashboardScreen';

/**
 * Days a learning-mode user must have had the app before the dashboard nudges
 * them toward Control mode — enough runway to have logged a few entries.
 */
const NUDGE_AFTER_DAYS = 7;

export default function DashboardRoute() {
  const mode = useAppMode();
  const { daysSinceCreated } = useAppSettings();

  // App-mode gating stays at the routing layer (the dashboard feature never
  // imports auth). The "logged enough" signal comes pre-derived from the hook.
  const showControlNudge = mode === 'learning' && daysSinceCreated >= NUDGE_AFTER_DAYS;

  return (
    <DashboardScreen includeBudgetData={mode === 'control'} showControlNudge={showControlNudge} />
  );
}
