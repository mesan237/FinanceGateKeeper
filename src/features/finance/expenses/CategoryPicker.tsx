import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Modal } from '@/components/Modal';
import { Typography } from '@/components/Typography';
import { PRIMARY_GREEN } from '@/constants/colors';

import { useCategories } from './expenses.hooks';
import type { Category } from './expenses.types';

/** A category/subcategory selection committed by the picker. */
export interface CategorySelection {
  categoryId: number;
  subcategoryId: number | null;
  label: string;
}

export interface CategoryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (selection: CategorySelection) => void;
}

/**
 * Modal drill-down picker: tap a parent to reveal its subcategories. Selecting
 * a subcategory commits both ids; the "Use <parent>" row commits the parent
 * alone (no subcategory). Either choice closes the picker.
 */
export function CategoryPicker({ visible, onClose, onSelect }: CategoryPickerProps) {
  const router = useRouter();
  const { categories, subcategoriesOf, refresh } = useCategories();
  const [parent, setParent] = useState<Category | null>(null);

  // Re-fetch whenever the picker opens so categories edited in the manager
  // (added / renamed / hidden) show up without remounting the log screen.
  useEffect(() => {
    if (visible) void refresh();
  }, [visible, refresh]);

  const reset = () => setParent(null);

  const close = () => {
    reset();
    onClose();
  };

  const commit = (selection: CategorySelection) => {
    reset();
    onSelect(selection);
  };

  const subcategories = parent ? subcategoriesOf(parent.id) : [];

  return (
    <Modal visible={visible} onRequestClose={close} transparent animationType="fade">
      <View style={styles.header}>
        <Typography variant="subheading">
          {parent ? parent.name : 'Select category'}
        </Typography>
        <Pressable accessibilityRole="button" onPress={parent ? reset : close}>
          <Typography style={styles.action}>{parent ? 'Back' : 'Close'}</Typography>
        </Pressable>
      </View>

      <ScrollView style={styles.list}>
        {parent === null
          ? categories.map((category) => (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                style={styles.row}
                onPress={() => setParent(category)}
              >
                <Typography>{category.name}</Typography>
              </Pressable>
            ))
          : [
              <Pressable
                key="parent-only"
                accessibilityRole="button"
                style={styles.row}
                onPress={() =>
                  commit({ categoryId: parent.id, subcategoryId: null, label: parent.name })
                }
              >
                <Typography style={styles.action}>{`Use ${parent.name}`}</Typography>
              </Pressable>,
              ...subcategories.map((sub) => (
                <Pressable
                  key={sub.id}
                  accessibilityRole="button"
                  style={styles.row}
                  onPress={() =>
                    commit({ categoryId: parent.id, subcategoryId: sub.id, label: sub.name })
                  }
                >
                  <Typography>{sub.name}</Typography>
                </Pressable>
              )),
            ]}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Manage categories"
        style={styles.manage}
        onPress={() => {
          close();
          router.push('/expenses/categories');
        }}
      >
        <Typography style={styles.action}>Manage categories</Typography>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  action: {
    color: PRIMARY_GREEN,
    fontWeight: '600',
  },
  list: {
    maxHeight: 320,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  manage: {
    paddingTop: 14,
    alignItems: 'center',
  },
});
