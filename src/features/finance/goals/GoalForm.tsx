import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { ReserveSizeField } from './ReserveSizeField';
import { useGoalForm } from './goals.hooks';
import { GOAL_KINDS, type GoalKind } from './goals.types';

export interface GoalFormProps {
  /** The goal to edit; omitted to create one. */
  goalId?: number;
}

/**
 * Create or edit a goal (VS-48): kind, name, target, the date a sinking fund
 * is needed by, the wallet that holds its money, and the monthly amount to set
 * aside. Two one-tap suggestions remove the blank page — a month of essentials
 * as a buffer's target, and what a sinking fund needs each month to arrive on
 * time. Editing adds a confirm-guarded Delete; the money stays in the wallet.
 */
export function GoalForm({ goalId }: GoalFormProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['goals', 'common']);
  const form = useGoalForm(goalId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleSave = async () => {
    if (await form.save()) router.back();
  };

  const handleDelete = async () => {
    setConfirmingDelete(false);
    if (await form.remove()) router.back();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t(form.isEditing ? 'form.editTitle' : 'form.newTitle')}
        cancelLabel={t('common:actions.cancel')}
      />

      <KeyboardAwareForm>
        <View style={styles.fields}>
          <SegmentedControl
            testID="goal-kind"
            segments={GOAL_KINDS.map((kind) => ({ key: kind, label: t(`kinds.${kind}`) }))}
            value={form.kind}
            onChange={(key) => form.setKind(key as GoalKind)}
          />
          <Typography variant="muted">{t(`form.kindHint.${form.kind}`)}</Typography>

          <Field label={t('form.name')}>
            <TextInput
              testID="goal-name"
              placeholder={t(`form.namePlaceholder.${form.kind}`)}
              value={form.name}
              onChangeText={form.setName}
              accessibilityLabel={t('form.name')}
            />
          </Field>

          {form.kind === 'reserve' ? (
            <Field label={t('form.months')}>
              <ReserveSizeField months={form.months} onMonthsChange={form.setMonths} essentials={form.essentialMonthly} />
            </Field>
          ) : (
            <Field label={t('form.target')}>
              <AmountInput testID="goal-target" value={form.target} onChangeText={form.setTarget} accessibilityLabel={t('form.target')} />
              {form.kind === 'buffer' && form.essentials ? (
                <Button
                  label={t('form.essentialsSuggestion', { amount: formatCurrency(form.essentials) })}
                  variant="secondary"
                  compact
                  onPress={() => form.setTarget(String(form.essentials))}
                />
              ) : null}
            </Field>
          )}

          {form.kind === 'sinking' ? (
            <Field label={t('form.targetDate')}>
              <DateField
                testID="goal-date"
                value={form.targetDate}
                onChange={form.setTargetDate}
                accessibilityLabel={t('form.targetDate')}
              />
            </Field>
          ) : null}

          <Field label={t('form.wallet')}>
            <AccountPicker testID="goal-wallet" value={form.accountId} onChange={form.setAccountId} />
            <Typography variant="muted">{t('form.walletHint')}</Typography>
          </Field>

          <Field label={t('form.monthly')}>
            <AmountInput testID="goal-monthly" value={form.monthly} onChangeText={form.setMonthly} accessibilityLabel={t('form.monthly')} />
            {form.neededMonthly ? (
              <Button
                label={t('form.neededSuggestion', { amount: formatCurrency(form.neededMonthly) })}
                variant="secondary"
                compact
                onPress={() => form.setMonthly(String(form.neededMonthly))}
              />
            ) : null}
          </Field>

          {form.error ? <Typography style={styles.error}>{form.error}</Typography> : null}

          {form.isEditing ? (
            <Button testID="goal-delete" label={t('form.delete')} variant="danger" onPress={() => setConfirmingDelete(true)} />
          ) : null}
        </View>
      </KeyboardAwareForm>

      <View style={styles.footer}>
        <Button label={t('common:actions.save')} onPress={handleSave} disabled={!form.canSubmit} />
      </View>

      <Modal visible={confirmingDelete} onRequestClose={() => setConfirmingDelete(false)}>
        <View style={styles.modal}>
          <Typography variant="subheading">{t('form.deleteTitle')}</Typography>
          <Typography variant="muted">{t('form.deleteBody')}</Typography>
          <Button testID="goal-delete-confirm" label={t('common:actions.delete')} variant="danger" onPress={handleDelete} />
          <Button label={t('common:actions.cancel')} onPress={() => setConfirmingDelete(false)} />
        </View>
      </Modal>
    </View>
  );
}

/** A labelled form field. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Typography variant="label">{label}</Typography>
      {children}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    fields: { paddingHorizontal: SPACING.lg, gap: SPACING.lg },
    field: { gap: 6, alignItems: 'stretch' },
    footer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg },
    modal: { gap: SPACING.md },
    error: { color: c.DANGER },
  });
