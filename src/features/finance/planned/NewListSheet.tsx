import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';

export interface NewListSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Creates the list; resolves `true` on success (the sheet then closes). */
  onCreate: (name: string, dueDate: string) => Promise<boolean>;
}

/**
 * The sheet for starting a shopping list: its name and the day the user plans
 * to shop. Both are required — the day is what the reminders count down to.
 */
export function NewListSheet({ visible, onClose, onCreate }: NewListSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} testID="new-list-sheet">
      <NewListForm onClose={onClose} onCreate={onCreate} />
    </BottomSheet>
  );
}

function NewListForm({ onClose, onCreate }: Omit<NewListSheetProps, 'visible'>) {
  const { t } = useTranslation('planned');
  const [name, setName] = useState('');
  // Starts empty: the user picks the day rather than accepting a default.
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<{ name?: string; dueDate?: string }>({});
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const next = {
      name: name.trim() === '' ? t('errors.nameRequired') : undefined,
      dueDate: dueDate === '' ? t('errors.dueDateRequired') : undefined,
    };
    setErrors(next);
    if (next.name || next.dueDate) return;

    setSaving(true);
    try {
      if (await onCreate(name, dueDate)) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Typography variant="subheading">{t('newList.title')}</Typography>
      <View>
        <Typography variant="muted" style={styles.label}>
          {t('newList.nameLabel')}
        </Typography>
        <TextInput
          testID="new-list-name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder={t('newList.namePlaceholder')}
          accessibilityLabel={t('newList.nameLabel')}
          autoFocus
          returnKeyType="done"
        />
        <FieldError message={errors.name} testID="new-list-name-error" />
      </View>
      <View>
        <Typography variant="muted" style={styles.label}>
          {t('newList.dueLabel')}
        </Typography>
        <DateField
          testID="new-list-date"
          value={dueDate}
          onChange={(iso) => {
            setDueDate(iso);
            setErrors((prev) => ({ ...prev, dueDate: undefined }));
          }}
          accessibilityLabel={t('newList.dueLabel')}
        />
        <FieldError message={errors.dueDate} testID="new-list-date-error" />
      </View>
      <Button
        testID="new-list-create"
        label={t('newList.create')}
        onPress={handleCreate}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  label: { marginBottom: 6 },
});
