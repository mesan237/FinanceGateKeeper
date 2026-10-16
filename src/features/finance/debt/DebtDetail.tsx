import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { useAccounts, useDefaultAccountId } from '@/features/finance/accounts/accounts.hooks';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong, formatDateShort } from '@/utils/formatDate';

import { RepaymentSheet } from './RepaymentSheet';
import { useDebtDetail } from './debt.hooks';

export interface DebtDetailProps {
  debtId: number;
}

/**
 * Full detail for one debt: person, amount, direction, due date, note and
 * status; what has been repaid and what is still owed; and every repayment,
 * each removable (VS-44). "Record repayment" opens a sheet that starts from
 * what is still owed, so paying in full — and settling — is one tap. Every
 * state keeps the back header, and the actions sit in a footer that clears the
 * Android system bar.
 */
export function DebtDetail({ debtId }: DebtDetailProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['debt', 'common']);
  const { debt, payments, loading, error, recordPayment, removePayment, remove } = useDebtDetail(debtId);
  const { accounts } = useAccounts();
  const defaultAccountId = useDefaultAccountId();
  const accountName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const [repaying, setRepaying] = useState(false);
  const [paymentToRemove, setPaymentToRemove] = useState<number | null>(null);

  if (loading && !debt) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('detail.title')} />
        <View style={styles.body}>
          <Typography variant="muted">{t('loading')}</Typography>
        </View>
      </View>
    );
  }

  if (!debt) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('detail.title')} />
        <View style={styles.body}>
          <Typography variant="muted">{t('detail.notFound')}</Typography>
          {error ? <Typography style={styles.error}>{error}</Typography> : null}
        </View>
      </View>
    );
  }

  const handleDelete = async () => {
    await remove();
    router.back();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('detail.title')} />

      <ScrollView style={styles.grow} contentContainerStyle={styles.body}>
        <Card>
          <View style={styles.rowHeader}>
            <Typography variant="heading">{debt.personName}</Typography>
            <Typography variant="muted">{t(`statuses.${debt.status}`)}</Typography>
          </View>
          <Typography variant="subheading">{formatCurrency(debt.amount)}</Typography>
          <Typography variant="muted">{t(`directions.${debt.direction}`)}</Typography>
          {debt.paid > 0 ? (
            <Typography>
              {t('detail.progress', {
                paid: formatCurrency(debt.paid),
                outstanding: formatCurrency(debt.outstanding),
              })}
            </Typography>
          ) : null}
          {debt.dueDate ? (
            <Typography variant="muted">{t('due', { date: formatDateLong(debt.dueDate) })}</Typography>
          ) : null}
          {debt.note ? <Typography style={styles.note}>{debt.note}</Typography> : null}
        </Card>

        {payments.length > 0 ? (
          <View style={styles.section}>
            <Typography variant="label">{t('detail.repayments')}</Typography>
            {payments.map((payment) => (
              <Pressable
                key={payment.id}
                testID={`debt-payment-${payment.id}`}
                accessibilityRole="button"
                style={styles.paymentRow}
                onPress={() => setPaymentToRemove(payment.id)}
              >
                <View style={styles.grow}>
                  <Typography>{formatDateShort(payment.date)}</Typography>
                  <Typography variant="muted">
                    {payment.accountId === null
                      ? t('detail.noAccount')
                      : (accountName.get(payment.accountId) ?? t('detail.noAccount'))}
                  </Typography>
                </View>
                <Typography>{formatCurrency(payment.amount)}</Typography>
              </Pressable>
            ))}
          </View>
        ) : null}

        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </ScrollView>

      <View style={styles.footer}>
        {debt.status === 'pending' && debt.outstanding > 0 ? (
          <Button label={t('detail.recordRepayment')} onPress={() => setRepaying(true)} />
        ) : null}
        <Button variant="danger" label={t('common:actions.delete')} onPress={handleDelete} />
      </View>

      <RepaymentSheet
        visible={repaying}
        direction={debt.direction}
        outstanding={debt.outstanding}
        accountId={debt.accountId ?? defaultAccountId}
        onSave={recordPayment}
        onClose={() => setRepaying(false)}
      />

      <Modal visible={paymentToRemove !== null} onRequestClose={() => setPaymentToRemove(null)}>
        <View style={styles.section}>
          <Typography variant="subheading">{t('detail.removePaymentTitle')}</Typography>
          <Typography variant="muted">{t('detail.removePaymentBody')}</Typography>
          <Button
            testID="remove-payment-confirm"
            variant="danger"
            label={t('detail.removePayment')}
            onPress={async () => {
              const id = paymentToRemove;
              setPaymentToRemove(null);
              if (id !== null) await removePayment(id);
            }}
          />
          <Button label={t('common:actions.cancel')} onPress={() => setPaymentToRemove(null)} />
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
  },
  grow: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 16,
    gap: 12,
  },
  section: {
    gap: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  note: {
    color: c.TEXT_MUTED,
    marginTop: 8,
  },
  error: {
    color: c.DANGER,
  },
});
