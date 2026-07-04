import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { AllocationSettings } from './AllocationSettings';

/**
 * Thin route wrapper for the budget-settings screen. Reads the optional `month`
 * param — passed by the allocation screen's first-run redirect and its "Adjust
 * split" link (VS-25) — so settings edits the same month the income belongs to.
 * When the param is absent, `AllocationSettings` defaults to the current month.
 */
export function AllocationSettingsRoute() {
  const { month } = useLocalSearchParams<{ month?: string }>();
  return <AllocationSettings monthISO={month} />;
}
