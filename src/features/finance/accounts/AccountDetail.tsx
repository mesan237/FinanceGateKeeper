import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { DANGER, SUCCESS, SUCCESS_TEXT, TEXT_MUTED } from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';
import type { IconName } from '@/constants/icons';
import { currentMonthISO, formatDateShort } from '@/utils/formatDate';
import { formatCurrency } from '@/utils/formatCurrency';

import { useAccountDetail, useAccountStats } from './accounts.hooks';
import type { AccountHistoryKind } from './accounts.types';

export interface AccountDetailProps {
  accountId: number;
}

/** Whether a history entry adds to (credit) or subtracts from (debit) the balance. */
const CREDIT_KINDS: AccountHistoryKind[] = ['income', 'transfer_in'];

const KIND_ICON: Record<AccountHistoryKind, IconName> = {
  income: 'income',
  expense: 'expense',
  transfer_in: 'transfer',
  transfer_out: 'transfer',
  fund_contribution: 'budget',
  project_contribution: 'projects',
};

/**
 * One wallet's detail: a balance hero, this month's income/expense share, and a
 * scrollable, account-filtered history (credits, debits, transfers, fund/project
 * contributions). The Edit button opens the form in edit mode.
 */
export function AccountDetail({ accountId }: AccountDetailProps) {
  const router = useRouter();
  const { account, balance, history, loading } = useAccountDetail(accountId);
  const { stats } = useAccountStats(accountId, currentMonthISO());

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={account?.name ?? 'Account'}
        rightAction={
          <Button
            testID="edit-account-button"
            label="Edit"
            variant="ghost"
            compact
            onPress={() => router.push(`/accounts/create?id=${accountId}`)}
          />
        }
      />

      <View style={styles.hero}>
        <Typography variant="muted">Balance</Typography>
        <Typography variant="display">{formatCurrency(balance)}</Typography>
        <View style={styles.statsRow}>
          <Typography variant="muted" style={styles.statIn}>
            ↑ {stats?.incomePercent ?? 0}% in
          </Typography>
          <Typography variant="muted" style={styles.statOut}>
            ↓ {stats?.expensePercent ?? 0}% out
          </Typography>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {!loading && history.length === 0 ? (
          <Typography variant="muted">No transactions yet.</Typography>
        ) : null}
        {history.map((entry) => {
          const credit = CREDIT_KINDS.includes(entry.kind);
          return (
            <View key={`${entry.kind}-${entry.refId}`} style={styles.row}>
              <Icon name={KIND_ICON[entry.kind]} size={20} color={credit ? SUCCESS : TEXT_MUTED} />
              <View style={styles.rowBody}>
                <Typography>{entry.label}</Typography>
                <Typography variant="muted">{formatDateShort(entry.date)}</Typography>
              </View>
              <Typography style={credit ? styles.amountCredit : styles.amountDebit}>
                {credit ? '+' : '−'}
                {formatCurrency(entry.amount)}
              </Typography>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  statIn: { color: SUCCESS_TEXT },
  statOut: { color: DANGER },
  list: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBody: { flex: 1 },
  amountCredit: { color: SUCCESS_TEXT, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  amountDebit: { color: DANGER, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
});
