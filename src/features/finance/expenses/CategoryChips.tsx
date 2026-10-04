import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Typography } from '@/components/Typography';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { RADIUS, SPACING } from '@/constants/layout';

import type { Category, FeedFilter } from './expenses.types';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  /** The amber imprévu style instead of the green category one. */
  warning?: boolean;
  testID?: string;
}

function Chip({ label, active, onPress, warning = false, testID }: ChipProps) {
  const styles = useThemedStyles(makeStyles);
  const activeStyle = warning ? styles.chipWarningActive : styles.chipActive;
  const idleText = warning ? styles.chipTextWarning : undefined;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={[styles.chip, warning && styles.chipWarning, active && activeStyle]}
    >
      <Typography style={[styles.chipText, active ? styles.chipTextActive : idleText]}>
        {label}
      </Typography>
    </Pressable>
  );
}

export interface CategoryChipsProps {
  categories: Category[];
  /** The active feed filter: a category id, the imprévus, or null for "All". */
  selectedId: FeedFilter;
  onSelect: (filter: FeedFilter) => void;
}

/**
 * The horizontal filter row above the transaction feed: All, then the imprévus
 * (amber, so they stand apart from the categories), then each category.
 */
export function CategoryChips({ categories, selectedId, onSelect }: CategoryChipsProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('expenses');
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Chip label={t('list.all')} active={selectedId === null} onPress={() => onSelect(null)} />
      <Chip
        testID="filter-unplanned"
        label={t('list.unplannedFilter')}
        active={selectedId === 'unplanned'}
        onPress={() => onSelect('unplanned')}
        warning
      />
      {categories.map((cat) => (
        <Chip
          key={cat.id}
          label={displayCategoryName(cat.name, cat.isDefault)}
          active={selectedId === cat.id}
          onPress={() => onSelect(cat.id)}
        />
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  // The row bleeds through the screen's gutter (TransactionList pads by
  // SPACING.lg) so pills scroll off the screen edge instead of being cut at an
  // invisible line; the content padding puts the first and last pill back on
  // the gutter.
  scroll: {
    flexGrow: 0,
    marginBottom: 8,
    marginHorizontal: -SPACING.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: c.BACKGROUND,
    borderWidth: 1,
    borderColor: c.BORDER,
  },
  // Android pads custom fonts with extra room above the text (Work Sans has a
  // tall ascender), which sat the label low in the pill. Dropping that padding
  // and fixing the line height centres it.
  chipText: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  chipActive: {
    backgroundColor: c.PRIMARY_GREEN,
    borderColor: c.PRIMARY_GREEN,
  },
  chipTextActive: {
    color: c.TEXT_INVERSE,
  },
  chipWarning: {
    borderColor: c.WARNING,
  },
  chipWarningActive: {
    backgroundColor: c.WARNING,
    borderColor: c.WARNING,
  },
  chipTextWarning: {
    color: c.WARNING_TEXT,
  },
});
