import React from 'react';

import { useAppMode } from '@/features/finance/auth/AppModeProvider';
import { DashboardScreen } from '@/features/finance/dashboard/DashboardScreen';

export default function DashboardRoute() {
  const mode = useAppMode();
  return <DashboardScreen includeBudgetData={mode === 'control'} />;
}
