import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { TransferLogScreen } from './TransferLogScreen';

/**
 * Opens the transfer form for a new transfer, reading an optional `?to=<id>`
 * so another screen can point it at a wallet by path alone — "Save now" on a
 * goal does (VS-48). An invalid `to` is ignored. Lives in the feature so only
 * features touch `expo-router` hooks.
 */
export function TransferLogRoute() {
  const params = useLocalSearchParams<{ to?: string }>();
  const to = Number(params.to);
  return <TransferLogScreen toAccountId={Number.isInteger(to) && to > 0 ? to : undefined} />;
}
