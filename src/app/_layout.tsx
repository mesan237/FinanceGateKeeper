import { Stack } from 'expo-router';
import React from 'react';

import { RecurringAutoLogger } from '@/features/finance/expenses/RecurringAutoLogger';

export default function RootLayout() {
  return (
    <RecurringAutoLogger>
      <Stack screenOptions={{ headerShown: false }} />
    </RecurringAutoLogger>
  );
}
