import i18n from 'i18next';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Modal } from '@/components/Modal';
import { Typography } from '@/components/Typography';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { useAccounts, useDefaultAccountId } from '@/features/finance/accounts/accounts.hooks';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort, toISODate } from '@/utils/formatDate';

import { getRefunds, recordRefund, removeRefund } from './expenses.refunds';
import type { NewRefund, Refund } from './expenses.types';

export interface ExpenseRefundsProps {
  expenseId: number;
  /** The purchase amount; refunds can add up to it, no more. */
  amount: number;
  /** The purchase's account; a refund starts there, else on the default. */
  accountId: number | null;
}

/** Loads a purchase's refunds and exposes record/remove, re-reading after each. */
function useRefunds(expenseId: number) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRefunds(await getRefunds(expenseId));
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.refundFailed', { ns: 'expenses' }));
    }
  }, [expenseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const record = useCallback(
    async (refund: NewRefund): Promise<boolean> => {
      try {
        await recordRefund(expenseId, refund);
        await refresh();
        setError(null);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : i18n.t('errors.refundFailed', { ns: 'expenses' }));
        return false;
      }
    },
    [expenseId, refresh],
  );

  const remove = useCallback(
    async (refundId: number) => {
      await removeRefund(refundId);
      await refresh();
    },
    [refresh],
  );

  return { refunds, error, record, remove };
}

/**
 * The Refunds section of a purchase (VS-45): what came back, into which
 * account, and when; "Record refund" opens a sheet that starts from what is
 * left to refund. A refund lowers the purchase category's spending in the
 * month the money comes back. Tapping a refund removes it.
 */
export function ExpenseRefunds({ expenseId, amount, accountId }: ExpenseRefundsProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['expenses', 'common']);
  const { refunds, error, record, remove } = useRefunds(expenseId);
  const { accounts } = useAccounts();
  const defaultAccountId = useDefaultAccountId();
  const accountName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

  const refunded = refunds.reduce((sum, r) => sum + r.amount, 0);
  const refundable = amount - refunded;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftAmount, setDraftAmount] = useState('');
  const [draftAccount, setDraftAccount] = useState<number | null>(null);
  const [draftDate, setDraftDate] = useState(toISODate(new Date()));
  const [toRemove, setToRemove] = useState<number | null>(null);

  const openSheet = () => {
    setDraftAmount(String(refundable));
    setDraftAccount(accountId ?? defaultAccountId);
    setDraftDate(toISODate(new Date()));
    setSheetOpen(true);
  };

  const value = Math.trunc(Number(draftAmount));
  const valid = draftAmount !== '' && value > 0 && value <= refundable;

  const save = async () => {
    if (!valid) return;
    if (await record({ amount: value, accountId: draftAccount, date: draftDate })) setSheetOpen(false);
  };

  return (
    <View style={styles.section}>
      {refunds.length > 0 ? (
        <>
          <Typography variant="label">{t('refunds.title')}</Typography>
          <Typography variant="muted">
            {t('refunds.progress', { refunded: formatCurrency(refunded), amount: formatCurrency(amount) })}
          </Typography>
          {refunds.map((refund) => (
            <Pressable
              key={refund.id}
              testID={`expense-refund-${refund.id}`}
              accessibilityRole="button"
              style={styles.row}
              onPress={() => setToRemove(refund.id)}
            >
              <View style={styles.grow}>
                <Typography>{formatDateShort(refund.date)}</Typography>
                <Typography variant="muted">
                  {refund.accountId === null ? t('refunds.noAccount') : (accountName.get(refund.accountId) ?? t('refunds.noAccount'))}
                </Typography>
              </View>
              <Typography style={styles.credit}>{`+${formatCurrency(refund.amount)}`}</Typography>
            </Pressable>
          ))}
        </>
      ) : null}

      {refundable > 0 ? (
        <Button label={t('refunds.record')} variant="secondary" onPress={openSheet} />
      ) : null}
      {error ? <Typography style={styles.error}>{error}</Typography> : null}

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} testID="refund-sheet">
        <View style={styles.section}>
          <Typography variant="subheading">{t('refunds.sheetTitle')}</Typography>
          <Typography variant="muted">{t('refunds.hint')}</Typography>
          <AmountInput value={draftAmount} onChangeText={setDraftAmount} testID="refund-amount" />
          <AccountPicker
            testID="refund-account"
            label={t('refunds.into')}
            value={draftAccount}
            onChange={setDraftAccount}
          />
          <DateField value={draftDate} onChange={setDraftDate} testID="refund-date" />
          <Button testID="refund-save" label={t('common:actions.save')} onPress={save} disabled={!valid} />
          <Button label={t('common:actions.cancel')} variant="ghost" onPress={() => setSheetOpen(false)} />
        </View>
      </BottomSheet>

      <Modal visible={toRemove !== null} onRequestClose={() => setToRemove(null)}>
        <View style={styles.section}>
          <Typography variant="subheading">{t('refunds.removeTitle')}</Typography>
          <Typography variant="muted">{t('refunds.removeBody')}</Typography>
          <Button
            testID="remove-refund-confirm"
            variant="danger"
            label={t('common:actions.delete')}
            onPress={async () => {
              const id = toRemove;
              setToRemove(null);
              if (id !== null) await remove(id);
            }}
          />
          <Button label={t('common:actions.cancel')} onPress={() => setToRemove(null)} />
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    grow: { flex: 1 },
    credit: { color: c.SUCCESS_TEXT },
    error: { color: c.DANGER },
  });
