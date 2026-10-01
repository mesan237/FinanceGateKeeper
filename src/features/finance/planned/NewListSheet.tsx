import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';

export interface NewListSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Creates the list; resolves `true` on success (the sheet then closes). */
  onCreate: (name: string) => Promise<boolean>;
}

/** A one-field sheet for naming a new shopping list. */
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (name.trim() === '') {
      setError(t('errors.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      if (await onCreate(name)) onClose();
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
            setError(null);
          }}
          placeholder={t('newList.namePlaceholder')}
          accessibilityLabel={t('newList.nameLabel')}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />
        <FieldError message={error ?? undefined} testID="new-list-name-error" />
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
