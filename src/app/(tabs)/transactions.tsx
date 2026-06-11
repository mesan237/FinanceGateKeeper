import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useActionBarStyle } from '@/features/finance/auth/auth.hooks';
import { TransactionsScreen } from '@/features/finance/expenses/TransactionsScreen';

export default function TransactionsRoute() {
  const { style, refresh } = useActionBarStyle();
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return <TransactionsScreen actionBarStyle={style} />;
}
