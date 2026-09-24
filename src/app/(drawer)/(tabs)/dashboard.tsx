import React from 'react';

import { DashboardScreen } from '@/features/finance/dashboard/DashboardScreen';

/**
 * Dashboard entry point. Budget data is always included: since VS-34 the Budget
 * tab is no longer gated on Control mode, so the learning-mode empty state and
 * the nudge that pointed at a hidden feature have nothing left to reveal.
 */
export default function DashboardRoute() {
  return <DashboardScreen includeBudgetData />;
}
