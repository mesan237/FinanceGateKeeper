import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

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
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['accounts', 'common']);
  const { account, balance, history, loading } = useAccountDetail(accountId);
  const { stats } = useAccountStats(accountId, currentMonthISO());

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={account?.name ?? t('detail.fallbackTitle')}
        rightAction={
          <Button
            testID="edit-account-button"
            label={t('common:actions.edit')}
            variant="ghost"
            compact
            onPress={() => router.push(`/accounts/create?id=${accountId}`)}
          />
        }
      />

      <View style={styles.hero}>
        <Typography variant="muted">{t('detail.balance')}</Typography>
        <Typography variant="display">{formatCurrency(balance)}</Typography>
        <View style={styles.statsRow}>
          <Typography variant="muted" style={styles.statIn}>
            {t('overview.statIn', { percent: stats?.incomePercent ?? 0 })}
          </Typography>
          <Typography variant="muted" style={styles.statOut}>
            {t('overview.statOut', { percent: stats?.expensePercent ?? 0 })}
          </Typography>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {!loading && history.length === 0 ? (
          <Typography variant="muted">{t('detail.empty')}</Typography>
        ) : null}
        {history.map((entry) => {

          const credit = CREDIT_KINDS.includes(entry.kind);
          return (
            <View key={`${entry.kind}-${entry.refId}`} style={styles.row}>
              <Icon name={KIND_ICON[entry.kind]} size={20} color={credit ? c.SUCCESS : c.TEXT_MUTED} />
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  statIn: { color: c.SUCCESS_TEXT },
  statOut: { color: c.DANGER },
  list: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBody: { flex: 1 },
  amountCredit: { color: c.SUCCESS_TEXT, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  amountDebit: { color: c.DANGER, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
});
