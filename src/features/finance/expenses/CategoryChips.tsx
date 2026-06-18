import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Typography } from '@/components/Typography';
import { BACKGROUND, BORDER, PRIMARY_GREEN, TEXT_INVERSE } from '@/constants/colors';
import { RADIUS } from '@/constants/layout';

import type { Category } from './expenses.types';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, active, onPress }: ChipProps) {
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

const styles = StyleSheet.create({
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
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: {
    backgroundColor: PRIMARY_GREEN,
    borderColor: PRIMARY_GREEN,
  },
  chipTextActive: {
    color: TEXT_INVERSE,
  },
});
