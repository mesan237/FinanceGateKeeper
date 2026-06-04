import React, { useEffect } from 'react';

import { runRecurringAutoLog } from './expenses.service';

export interface RecurringAutoLoggerProps {
  children: React.ReactNode;
}

/**
 * App-root wrapper that auto-logs every due recurring expense exactly once per
 * app mount, before any screen reads expense data. Errors are swallowed (logged
 * to console) so a transient DB failure never gates the user out of the app —
 * the next mount retries. The domain logic lives in `runRecurringAutoLog`; this
 * component only composes it into the tree.
 */
export function RecurringAutoLogger({ children }: RecurringAutoLoggerProps) {
  useEffect(() => {
    void runRecurringAutoLog().catch((e) => {
      console.error('Recurring auto-log failed:', e);
    });
  }, []);

  return <>{children}</>;
}
