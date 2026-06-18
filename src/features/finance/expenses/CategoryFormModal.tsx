import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';

export interface CategoryFormModalProps {
  visible: boolean;
  /** Parent name when adding a subcategory; `null` adds a top-level category. */
  parentName: string | null;
  /** Called with the trimmed-but-raw name; the caller persists and refreshes. */
  onSubmit: (name: string) => void | Promise<void>;
  onClose: () => void;
}

/**
 * Prompt for a new category or subcategory name. The single field serves both
 * cases — `parentName` only changes the wording — so creation lives in one
 * focused dialog instead of inline inputs competing with each row's controls.
 */
export function CategoryFormModal({ visible, parentName, onSubmit, onClose }: CategoryFormModalProps) {
  const [name, setName] = useState('');

  // Reset the field each time the modal opens so a previous draft never leaks
  // into the next add.
  useEffect(() => {
    if (visible) setName('');
  }, [visible]);

  const submit = async () => {
    if (!name.trim()) return;
    await onSubmit(name);
    onClose();
  };

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="fade">
      <View style={styles.body}>
        <Typography variant="subheading">
          {parentName ? `New subcategory in ${parentName}` : 'New category'}
        </Typography>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={parentName ? 'Subcategory name' : 'Category name'}
          accessibilityLabel="Category name"
          testID="category-name-input"
          autoFocus
          onSubmitEditing={submit}
          returnKeyType="done"
        />
        <Button label="Add" testID="category-save-btn" onPress={submit} />
        <Button label="Cancel" variant="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
});
