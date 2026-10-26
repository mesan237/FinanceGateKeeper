import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { toISODate } from '@/utils/formatDate';

import type { NewSpendingEvent } from './events.types';

export interface EventFormSheetProps {
  visible: boolean;
  /** Pre-fills the form to edit an event; omitted to create one. */
  initial?: NewSpendingEvent;
  onClose: () => void;
  /** Saves; a thrown error is shown in the sheet, which stays open. */
  onSave: (input: NewSpendingEvent) => Promise<void>;
}

/** Name and optional date for an event (VS-61), in a sheet: used to create and to edit. */
export function EventFormSheet({ visible, initial, onClose, onSave }: EventFormSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('events');
  const [name, setName] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    setDate(initial?.date ?? null);
    setError(null);
  }, [visible, initial]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ name: name.trim(), date });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="event-form">
      <View style={styles.body}>
        <Typography variant="subheading">{t(initial ? 'form.editTitle' : 'form.createTitle')}</Typography>
        <Typography variant="label">{t('form.name')}</Typography>
        <TextInput
          testID="event-form-name"
          value={name}
          onChangeText={setName}
          placeholder={t('form.namePlaceholder')}
          accessibilityLabel={t('form.name')}
        />
        <Typography variant="muted" testID="event-form-hint">
          {t('form.hint')}
        </Typography>
        <Typography variant="label">{t('form.date')}</Typography>
        {date ? (
          <DateField testID="event-form-date" value={date} onChange={setDate} onClear={() => setDate(null)} />
        ) : (
          <Button
            testID="event-form-add-date"
            label={t('form.date')}
            variant="ghost"
            compact
            onPress={() => setDate(toISODate(new Date()))}
          />
        )}
        {error ? <Typography style={styles.error}>{error}</Typography> : null}
        <Button
          testID="event-form-save"
          label={t('form.save')}
          onPress={() => void save()}
          disabled={name.trim() === '' || saving}
          loading={saving}
        />
      </View>
    </BottomSheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    body: { gap: SPACING.sm },
    error: { color: c.DANGER },
  });
