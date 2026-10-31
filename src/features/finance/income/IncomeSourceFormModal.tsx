import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { Modal } from '@/components/Modal';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';

export interface IncomeSourceFormModalProps {
  visible: boolean;
  title: string;
  /** The name the field starts with (a rename); empty for a new source. */
  initialName?: string;
  /** Why the last save was refused, shown under the field. */
  error: string | null;
  /** Saves the name; resolves true to close the form, false to keep it open. */
  onSubmit: (name: string) => Promise<boolean>;
  onClose: () => void;
}

/**
 * Asks for an income source's name (VS-91), for a new source, a new subsource
 * or a rename. A refused name (empty, or one a sibling already has) keeps the
 * form open with the reason, so the user can correct it.
 */
export function IncomeSourceFormModal({
  visible,
  title,
  initialName = '',
  error,
  onSubmit,
  onClose,
}: IncomeSourceFormModalProps) {
  const { t } = useTranslation(['income', 'common']);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  // Start from the given name each time the form opens, never a previous draft.
  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  const submit = async () => {
    setSaving(true);
    try {
      if (await onSubmit(name)) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="fade">
      <View style={styles.body}>
        <Typography variant="subheading">{title}</Typography>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('sources.namePlaceholder')}
          accessibilityLabel={t('sources.nameLabel')}
          testID="income-source-name"
          autoFocus
          onSubmitEditing={submit}
          returnKeyType="done"
        />
        <FieldError message={error} testID="income-source-error-text" />
        <Button label={t('common:actions.save')} testID="income-source-save" onPress={submit} loading={saving} />
        <Button label={t('common:actions.cancel')} variant="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
});
