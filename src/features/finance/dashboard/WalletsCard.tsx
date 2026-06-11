import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ACCOUNT_TYPE_ICON } from '@/features/finance/accounts/accountIcons';
import { useAccounts } from '@/features/finance/accounts/accounts.hooks';
import { formatCurrency } from '@/utils/formatCurrency';

/**
 * Compact Wallets summary on the dashboard: one row per active account with its
 * live computed balance. Tapping anywhere on the card opens the Accounts tab.
 * Read-only — the approved `dashboard → accounts` cross-feature edge (VS-18).
 */
export function WalletsCard() {
  const router = useRouter();
  const { accounts, balances, loading } = useAccounts();

  if (loading || accounts.length === 0) return null;

  return (
    <Pressable
      testID="wallets-card"
      accessibilityRole="button"
      onPress={() => router.push('/accounts')}
    >
      <Card>
        <Typography variant="label">Wallets</Typography>
        <View style={styles.list}>
          {accounts.map((account) => (
            <View key={account.id} testID={`wallet-row-${account.id}`} style={styles.row}>
              <Icon name={ACCOUNT_TYPE_ICON[account.type]} size={18} />
              <Typography style={styles.name}>{account.name}</Typography>
              <Typography style={styles.balance}>
                {formatCurrency(balances[account.id] ?? 0)}
              </Typography>
            </View>
          ))}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1 },
  balance: { fontWeight: '600' },
});
