import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { ACCOUNT_TYPE_ICON } from '@/features/finance/accounts/accountIcons';
import { useAccounts } from '@/features/finance/accounts/accounts.hooks';
import { formatCurrency } from '@/utils/formatCurrency';

/**
 * Compact Wallets summary on the dashboard: one row per active account with its
 * live computed balance. Tapping anywhere on the card opens the Accounts tab.
 * With no accounts yet it renders a set-up CTA instead of disappearing —
 * otherwise the accounts feature has no visible entry point on the dashboard.
 * Read-only — the approved `dashboard → accounts` cross-feature edge (VS-18).
 */
export function WalletsCard() {
  const router = useRouter();
  const { accounts, balances, loading } = useAccounts();
  const styles = useThemedStyles(makeStyles);

  if (loading) return null;

  if (accounts.length === 0) {
    return (
      <Pressable
        testID="wallets-card-empty"
        accessibilityRole="button"
        onPress={() => router.push('/accounts/create')}
      >
        <Card style={styles.emptyCard}>
          <Typography variant="label">Wallets</Typography>
          <Typography variant="muted">
            Track cash and Mobile Money separately by setting up your wallets.
          </Typography>
          <Typography style={styles.emptyCta}>Set up your wallets →</Typography>
        </Card>
      </Pressable>
    );
  }

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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  list: { marginTop: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1 },
  balance: { fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  emptyCard: {
    borderWidth: 1,
    borderColor: c.BORDER,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    gap: 6,
  },
  emptyCta: {
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
