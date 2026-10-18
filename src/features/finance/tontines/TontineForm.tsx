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

import { useTontineForm } from './tontines.hooks';
import { TONTINE_FREQUENCIES, type TontineFrequency } from './tontines.types';

export interface TontineFormProps {
  /** The tontine to edit; omitted to create one. */
  tontineId?: number;
}

/**
 * Create or edit a tontine (VS-51): name, contribution, how often, the first
 * contribution's date, the members (one cycle each), the user's turn — blank
 * until the draw — and the usual wallet. A new tontine opens on save; editing
 * adds a confirm-guarded Delete.
 */
export function TontineForm({ tontineId }: TontineFormProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['tontines', 'common']);
  const form = useTontineForm(tontineId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleSave = async () => {
    const id = await form.save();
    if (id === null) return;
    if (form.isEditing) router.back();
    else router.replace(`/tontines/${id}`);
  };

  const handleDelete = async () => {
    setConfirmingDelete(false);
    if (await form.remove()) router.replace('/tontines');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t(form.isEditing ? 'form.editTitle' : 'form.newTitle')}
        cancelLabel={t('common:actions.cancel')}
      />

      <KeyboardAwareForm>
        <View style={styles.fields}>
          <Field label={t('form.name')}>
            <TextInput
              testID="tontine-name"
              placeholder={t('form.namePlaceholder')}
              value={form.name}
              onChangeText={form.setName}
              accessibilityLabel={t('form.name')}
            />
          </Field>

          <Field label={t('form.contribution')}>
            <AmountInput
              testID="tontine-contribution"
              value={form.contribution}
              onChangeText={form.setContribution}
              accessibilityLabel={t('form.contribution')}
            />
          </Field>

          <Field label={t('form.frequency')}>
            <SegmentedControl
              testID="tontine-frequency"
              segments={TONTINE_FREQUENCIES.map((f) => ({ key: f, label: t(`form.frequencies.${f}`) }))}
              value={form.frequency}
              onChange={(key) => form.setFrequency(key as TontineFrequency)}
            />
          </Field>

          <Field label={t('form.startDate')}>
            <DateField
              testID="tontine-start"
              value={form.startDate}
              onChange={form.setStartDate}
              accessibilityLabel={t('form.startDate')}
            />
          </Field>

          <Field label={t('form.members')}>
            <TextInput
              testID="tontine-members"
              keyboardType="number-pad"
              value={form.members}
              onChangeText={form.setMembers}
              accessibilityLabel={t('form.members')}
            />
            <Typography variant="muted">{t('form.membersHint')}</Typography>
          </Field>

          <Field label={t('form.turn')}>
            <TextInput
              testID="tontine-turn"
              keyboardType="number-pad"
              value={form.turn}
              onChangeText={form.setTurn}
              accessibilityLabel={t('form.turn')}
            />
            <Typography variant="muted">{t('form.turnHint')}</Typography>
          </Field>

          <Field label={t('form.wallet')}>
            <AccountPicker testID="tontine-wallet" value={form.accountId} onChange={form.setAccountId} />
          </Field>

          {form.error ? <Typography style={styles.error}>{form.error}</Typography> : null}

          {form.isEditing ? (
            <Button
              testID="tontine-delete"
              label={t('form.delete')}
              variant="danger"
              onPress={() => setConfirmingDelete(true)}
            />
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
          <Button
            testID="tontine-delete-confirm"
            label={t('common:actions.delete')}
            variant="danger"
            onPress={handleDelete}
          />
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
    field: { gap: 6 },
    footer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg },
    modal: { gap: SPACING.md },
    error: { color: c.DANGER },
  });
