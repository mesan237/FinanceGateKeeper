import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { currentMonthISO } from '@/utils/formatDate';

import { CategoryDetailScreen } from './CategoryDetailScreen';

/** A well-formed `YYYY-MM` month key. */
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Reads the category `id` and the optional `month` and `sub` (VS-59) params and renders the category
 * drill-down (VS-56), falling back to the current month when the param is absent
 * or malformed — the same split as `BudgetPlannerRoute`.
 */
export function CategoryDetailRoute() {
  const { id, month, sub } = useLocalSearchParams<{ id: string; month?: string; sub?: string }>();
  const monthISO = typeof month === 'string' && MONTH_PATTERN.test(month) ? month : currentMonthISO();
  // `sub` narrows to a subcategory id, or 'none' for spending with no subcategory (VS-59).
  const subcategory = sub === 'none' ? 'none' : typeof sub === 'string' && /^\d+$/.test(sub) ? Number(sub) : undefined;

  return <CategoryDetailScreen monthISO={monthISO} categoryId={Number(id)} subcategory={subcategory} />;
}
