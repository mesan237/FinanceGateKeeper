import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { PRIMARY_GREEN, SUCCESS_TEXT } from '@/constants/colors';
import { currentMonthISO } from '@/utils/formatDate';
import { formatCurrency } from '@/utils/formatCurrency';

import { ACCOUNT_PURPOSE_LABEL, ACCOUNT_TYPE_ICON } from './accountIcons';
import { useAccountStats, useAccounts } from './accounts.hooks';
import type { Account } from './accounts.types';

function AccountCard({ account, balance }: { account: Account; balance: number }) {
  const router = useRouter();
  const { stats } = useAccountStats(account.id, currentMonthISO());

  return (
    <Pressable
      testID={`account-card-${account.id}`}
      accessibilityRole="button"
      onPress={() => router.push(`/accounts/${account.id}`)}
    >
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name={ACCOUNT_TYPE_ICON[account.type]} size={22} />
          <Typography variant="subheading" style={styles.cardName}>
            {account.name}
          </Typography>
          <Typography variant="label" style={styles.badge}>
            {ACCOUNT_PURPOSE_LABEL[account.purpose]}
          </Typography>
        </View>
        <Typography variant="heading">{formatCurrency(balance)}</Typography>
        <View style={styles.statsRow}>
          <Typography variant="muted" style={styles.statIn}>
            ↑ {stats?.incomePercent ?? 0}% in
          </Typography>
          <Typography variant="muted">↓ {stats?.expensePercent ?? 0}% out</Typography>
        </View>
      </Card>
    </Pressable>
  );
}

/**
 * The Accounts tab: one card per active wallet showing its computed balance,
 * purpose badge, and this month's income/expense share. An "Add account" button
 * opens the create form; tapping a card opens its detail.
 */
export function AccountsOverview() {
  const router = useRouter();
  const { accounts, balances, loading } = useAccounts();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Accounts" />
      <ScrollView contentContainerStyle={styles.list}>
        {!loading && accounts.length === 0 ? (
          <Typography variant="muted">No accounts yet.</Typography>
        ) : null}
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} balance={balances[account.id] ?? 0} />
        ))}
        <Button
          testID="add-account-button"
          label="Add account"
          variant="secondary"
          onPress={() => router.push('/accounts/create')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12 },
  card: { gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { flex: 1 },
  badge: { color: PRIMARY_GREEN },
  statsRow: { flexDirection: 'row', gap: 16 },
  statIn: { color: SUCCESS_TEXT },
});
