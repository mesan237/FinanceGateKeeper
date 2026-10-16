import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { FONT_FAMILY } from '@/constants/fonts';
import type { IconName } from '@/constants/icons';
import { currentMonthISO, formatDateShort } from '@/utils/formatDate';
import { formatCurrency } from '@/utils/formatCurrency';

import { ConfirmBalanceSheet } from './ConfirmBalanceSheet';
import { useAccountDetail, useAccountStats } from './accounts.hooks';
import type { AccountHistoryEntry, AccountHistoryKind } from './accounts.types';

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
  balance_check: 'check',
};

/**
 * The signed amount a history row shows. Every kind but a balance check carries
 * a positive amount and its direction in `kind`; a check carries the signed
 * correction it made (VS-42).
 */
function signedAmount(entry: AccountHistoryEntry): { credit: boolean; text: string } {
  if (entry.kind === 'balance_check') {
    return {
      credit: entry.amount >= 0,
      text: `${entry.amount >= 0 ? '+' : '−'}${formatCurrency(Math.abs(entry.amount))}`,
    };
  }
  const credit = CREDIT_KINDS.includes(entry.kind);
  return { credit, text: `${credit ? '+' : '−'}${formatCurrency(entry.amount)}` };
}

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
  const { account, balance, history, loading, confirm, removeCheck } = useAccountDetail(accountId);
  const { stats } = useAccountStats(accountId, currentMonthISO());
  const [confirming, setConfirming] = useState(false);
  const [checkToRemove, setCheckToRemove] = useState<number | null>(null);

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
        <Button
          testID="confirm-balance-button"
          label={t('detail.confirmBalance')}
          variant="secondary"
          compact
          onPress={() => setConfirming(true)}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {!loading && history.length === 0 ? (
          <Typography variant="muted">{t('detail.empty')}</Typography>
        ) : null}
        {history.map((entry) => {
          const { credit, text } = signedAmount(entry);
          // A balance check can be removed; a transfer opens for editing (VS-43).
          const isCheck = entry.kind === 'balance_check';
          const isTransfer = entry.kind === 'transfer_in' || entry.kind === 'transfer_out';
          return (
            <Pressable
              key={`${entry.kind}-${entry.refId}`}
              style={styles.row}
              disabled={!isCheck && !isTransfer}
              accessibilityRole={isCheck || isTransfer ? 'button' : undefined}
              onPress={() =>
                isCheck ? setCheckToRemove(entry.refId) : router.push(`/transfers/${entry.refId}`)
              }
            >
              <Icon name={KIND_ICON[entry.kind]} size={20} color={credit ? c.SUCCESS : c.TEXT_MUTED} />
              <View style={styles.rowBody}>
                <Typography>{entry.label}</Typography>
                <Typography variant="muted">{formatDateShort(entry.date)}</Typography>
              </View>
              <Typography
                testID={`history-amount-${entry.kind}-${entry.refId}`}
                style={credit ? styles.amountCredit : styles.amountDebit}
              >
                {text}
              </Typography>
            </Pressable>
          );
        })}
      </ScrollView>

      <ConfirmBalanceSheet
        visible={confirming}
        name={account?.name ?? ''}
        balance={balance}
        onConfirm={confirm}
        onClose={() => setConfirming(false)}
      />

      <Modal visible={checkToRemove !== null} onRequestClose={() => setCheckToRemove(null)}>
        <View style={styles.modal}>
          <Typography variant="subheading">{t('check.removeTitle')}</Typography>
          <Typography variant="muted">{t('check.removeBody')}</Typography>
          <Button
            testID="remove-check-confirm"
            label={t('check.remove')}
            variant="danger"
            onPress={async () => {
              const id = checkToRemove;
              setCheckToRemove(null);
              if (id !== null) await removeCheck(id);
            }}
          />
          <Button label={t('common:actions.cancel')} onPress={() => setCheckToRemove(null)} />
        </View>
      </Modal>
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
  modal: { gap: 12 },
});
