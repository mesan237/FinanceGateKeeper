import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Modal } from '@/components/Modal';
import { Typography } from '@/components/Typography';
import { getCategoryAvatar, getTransactionIcon } from '@/constants/categoryIcons';
import { BORDER, PRIMARY_GREEN, TEXT_INVERSE } from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';

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

function PickerIcon({ name }: { name: string }) {
  const emoji = getTransactionIcon('expense', name);
  if (emoji) {
    return <Typography style={styles.rowEmojiIcon}>{emoji}</Typography>;
  }
  const { color, letter } = getCategoryAvatar(name);
  return (
    <View style={[styles.rowAvatar, { backgroundColor: color }]}>
      <Typography style={styles.rowAvatarLetter}>{letter}</Typography>
    </View>
  );
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
                <PickerIcon name={category.name} />
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
                <PickerIcon name={parent.name} />
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
                  <PickerIcon name={sub.name} />
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
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  list: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  rowEmojiIcon: { fontSize: 20, lineHeight: 24, width: 20, textAlign: 'center' },
  rowAvatar: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarLetter: { color: TEXT_INVERSE, fontSize: 10, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  manage: {
    paddingTop: 14,
    alignItems: 'center',
  },
});
