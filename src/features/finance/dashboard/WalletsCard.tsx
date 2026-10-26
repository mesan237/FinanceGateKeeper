import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { ACCOUNT_TYPE_ICON } from '@/features/finance/accounts/accountIcons';
import { useAccounts, useWalletTrust } from '@/features/finance/accounts/accounts.hooks';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

/**
 * Compact Wallets summary on the dashboard: one row per active account with its
 * live computed balance, their total, and how far those balances can be trusted
 * (F-11) — when they were last confirmed and any spending outside every wallet,
 * with "Check balances" when either makes them doubtful. Tapping anywhere on the
 * card opens the Accounts tab, where balances are confirmed. Re-reads on focus.
 * With no accounts yet it renders a set-up CTA instead of disappearing —
 * otherwise the accounts feature has no visible entry point on the dashboard.
 * Read-only — the approved `dashboard → accounts` cross-feature edge (VS-18).
 */
export function WalletsCard() {
  const router = useRouter();
  const { accounts, balances, loading, refresh } = useAccounts();
  const trust = useWalletTrust();
  const refreshTrust = trust.refresh;
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('dashboard');

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshTrust();
    }, [refresh, refreshTrust]),
  );

  if (loading && accounts.length === 0) return null;

  if (accounts.length === 0) {
    return (
      <Pressable
        testID="wallets-card-empty"
        accessibilityRole="button"
        onPress={() => router.push('/accounts/create')}
      >
        <Card style={styles.emptyCard}>
          <Typography variant="label">{t('wallets.title')}</Typography>
          <Typography variant="muted">{t('wallets.emptyBody')}</Typography>
          <Typography style={styles.emptyCta}>{t('wallets.emptyCta')}</Typography>
        </Card>
      </Pressable>
    );
  }

  const total = accounts.reduce((sum, a) => sum + (balances[a.id] ?? 0), 0);
  // "Checked 3 days ago", or why the balances are not confirmed.
  const f = trust.freshness;
  const freshnessLine = !f
    ? null
    : f.checkedOn === null
      ? f.unchecked > 0
        ? t('wallets.neverChecked')
        : null
      : f.stale
        ? t('wallets.notSince', { date: formatDateShort(f.checkedOn) })
        : f.daysSince === 0
          ? t('wallets.checkedToday')
          : t('wallets.checkedAgo', { count: f.daysSince ?? 0 });
  const unassignedCount = trust.unassigned?.count ?? 0;
  const doubtful = (trust.freshness?.stale ?? false) || unassignedCount > 0;

  return (
    <Pressable
      testID="wallets-card"
      accessibilityRole="button"
      onPress={() => router.push('/accounts')}
    >
      <Card>
        <Typography variant="label">{t('wallets.title')}</Typography>
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
          <View style={[styles.row, styles.totalRow]} testID="wallets-total">
            <Typography style={styles.name}>{t('wallets.total')}</Typography>
            <Typography style={styles.balance}>{formatCurrency(total)}</Typography>
          </View>
        </View>
        {freshnessLine ? (
          <Typography
            variant="muted"
            style={[styles.note, trust.freshness?.stale && styles.doubt]}
            testID="wallets-freshness"
          >
            {freshnessLine}
          </Typography>
        ) : null}
        {unassignedCount > 0 ? (
          <Typography variant="muted" style={[styles.note, styles.doubt]} testID="wallets-unassigned">
            {t('wallets.unassigned', { count: unassignedCount })}
          </Typography>
        ) : null}
        {doubtful ? (
          <Typography style={[styles.note, styles.check]} testID="wallets-check">
            {t('wallets.check')}
          </Typography>
        ) : null}
      </Card>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  list: { marginTop: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  totalRow: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.BORDER,
  },
  name: { flex: 1 },
  balance: { fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  note: { marginTop: 8 },
  doubt: { color: c.WARNING_TEXT },
  check: { color: c.PRIMARY_TEXT, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
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
    color: c.PRIMARY_TEXT,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
