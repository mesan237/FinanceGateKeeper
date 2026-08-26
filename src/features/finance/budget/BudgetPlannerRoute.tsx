import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { currentMonthISO } from '@/utils/formatDate';

import { BudgetPlannerScreen } from './BudgetPlannerScreen';

/** A well-formed `YYYY-MM` month key. */
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Reads the optional `month` param and renders the planner for it, falling back
 * to the current month when the param is absent or malformed.
 *
 * Keeping the param-reading here leaves `app/budget/plan.tsx` a thin route and
 * `BudgetPlannerScreen` directly testable with a plain prop — the same split as
 * `AllocationSettingsRoute`.
 */
export function BudgetPlannerRoute() {
  const { month } = useLocalSearchParams<{ month?: string }>();
  const monthISO = typeof month === 'string' && MONTH_PATTERN.test(month) ? month : currentMonthISO();

  return <BudgetPlannerScreen monthISO={monthISO} />;
}
