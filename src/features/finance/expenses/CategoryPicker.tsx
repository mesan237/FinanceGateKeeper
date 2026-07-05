import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Typography } from '@/components/Typography';
import { getCategoryAvatar, getTransactionIcon } from '@/constants/categoryIcons';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

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
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const emoji = getTransactionIcon('expense', name);
  if (emoji) {
    return (
      <View style={[styles.rowAvatar, { backgroundColor: c.SURFACE }]}>
        <Typography style={styles.rowEmojiIcon}>{emoji}</Typography>
      </View>
    );
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
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
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
        {parent ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            style={styles.headerBtn}
            onPress={reset}
          >
            <Icon name="back" size={22} color={c.TEXT_PRIMARY} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}

        <View style={styles.headerText}>
          <Typography variant="subheading">{parent ? parent.name : 'Select category'}</Typography>
          <Typography variant="muted" style={styles.subtitle}>
            {parent ? 'Pick a subcategory, or use the category itself' : 'Tap a category to see its subcategories'}
          </Typography>
        </View>

        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          style={[styles.headerBtn, styles.headerBtnRight]}
          onPress={close}
        >
          <Typography style={styles.action}>Close</Typography>
        </Pressable>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {parent === null
          ? categories.map((category) => (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                style={styles.row}
                onPress={() => setParent(category)}
              >
                <PickerIcon name={category.name} />
                <Typography style={styles.rowLabel}>{category.name}</Typography>
                <Icon name="forward" size={20} color={c.TEXT_MUTED} />
              </Pressable>
            ))
          : [
              <Pressable
                key="parent-only"
                accessibilityRole="button"
                style={[styles.row, styles.useParentRow]}
                onPress={() =>
                  commit({ categoryId: parent.id, subcategoryId: null, label: parent.name })
                }
              >
                <View style={styles.useParentIcon}>
                  <Icon name="check" size={18} color={c.PRIMARY_GREEN} />
                </View>
                <Typography style={[styles.rowLabel, styles.action]}>{`Use ${parent.name}`}</Typography>
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
                  <Typography style={styles.rowLabel}>{sub.name}</Typography>
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
        <Icon name="settings" size={16} color={c.PRIMARY_GREEN} />
        <Typography style={styles.action}>Manage categories</Typography>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBtn: {
    minWidth: 48,
    justifyContent: 'center',
  },
  headerBtnRight: {
    alignItems: 'flex-end',
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  subtitle: {
    marginTop: 2,
    textAlign: 'center',
  },
  action: {
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  list: {
    maxHeight: 360,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: c.BACKGROUND,
    marginBottom: 8,
  },
  rowLabel: {
    flex: 1,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  useParentRow: {
    backgroundColor: c.PRIMARY_LIGHT,
  },
  useParentIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.SURFACE,
  },
  rowEmojiIcon: { fontSize: 20, lineHeight: 24, textAlign: 'center' },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarLetter: { color: c.TEXT_INVERSE, fontSize: 15, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
  },
});
