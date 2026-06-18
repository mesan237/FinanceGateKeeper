import React from 'react';

import { UnallocatedPoolScreen } from './UnallocatedPoolScreen';

/**
 * Thin wrapper so the route file stays a one-liner (mirrors
 * `AllocationFromIncomeRoute`). The pool screen takes no params — it reads the
 * whole pending pool — so there is nothing to validate here yet.
 */
export function UnallocatedPoolRoute() {
  return <UnallocatedPoolScreen />;
}
