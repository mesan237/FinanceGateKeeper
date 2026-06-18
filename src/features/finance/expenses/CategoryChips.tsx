import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { RADIUS } from '@/constants/layout';

import type { Category } from './expenses.types';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, active, onPress }: ChipProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Typography style={active ? styles.chipTextActive : undefined}>{label}</Typography>
    </Pressable>
  );
}

export interface CategoryChipsProps {
  categories: Category[];
  /** The active category filter, or null for "All". */
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

/** The horizontal category filter row above the transaction feed. */
export function CategoryChips({ categories, selectedId, onSelect }: CategoryChipsProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Chip label="All" active={selectedId === null} onPress={() => onSelect(null)} />
      {categories.map((cat) => (
        <Chip
          key={cat.id}
          label={cat.name}
          active={selectedId === cat.id}
          onPress={() => onSelect(cat.id)}
        />
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: c.BACKGROUND,
    borderWidth: 1,
    borderColor: c.BORDER,
  },
  chipActive: {
    backgroundColor: c.PRIMARY_GREEN,
    borderColor: c.PRIMARY_GREEN,
  },
  chipTextActive: {
    color: c.TEXT_INVERSE,
  },
});
