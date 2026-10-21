import React from 'react';

import { useMonthCloser } from './networth.hooks';

/**
 * Mounted once near the app root (like `RecurringAutoLogger`): stores the
 * month-end net worth and savings figures of every closed month that has none
 * yet (VS-53). Never blocks the app; renders its children untouched.
 */
export function MonthCloser({ children }: { children: React.ReactNode }) {
  useMonthCloser();
  return <>{children}</>;
}
