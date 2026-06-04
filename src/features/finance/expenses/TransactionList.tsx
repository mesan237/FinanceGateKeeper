import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { BACKGROUND, PRIMARY_GREEN } from '@/constants/colors';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { useCategories, useTransactions } from './expenses.hooks';
import type { TransactionFilter } from './expenses.types';

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
      style={[styles.chip, active && styles.chipActive]}
    >
      <Typography style={active ? styles.chipTextActive : undefined}>{label}</Typography>
    </Pressable>
  );
}

/**
 * Filterable, newest-first list of logged expenses. A category chip row drives
 * SQL-side filtering via `useTransactions`; each row's label is the
 * subcategory name when present, otherwise the parent category name. Shows an
 * empty state when nothing matches.
 */
export function TransactionList() {
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const filter = useMemo<TransactionFilter | undefined>(
    () => (categoryId != null ? { categoryId } : undefined),
    [categoryId],
  );
  const { expenses } = useTransactions(filter);
  const { categories, labelFor } = useCategories();

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        <Chip label="All" active={categoryId === null} onPress={() => setCategoryId(null)} />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            active={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </View>

      {expenses.length === 0 ? (
        <Typography variant="muted" style={styles.empty}>
          No transactions yet.
        </Typography>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Typography>{formatCurrency(item.amount)}</Typography>
              <Typography variant="muted">
                {`${labelFor(item.categoryId, item.subcategoryId)} · ${formatDateShort(item.date)}`}
              </Typography>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipActive: {
    backgroundColor: PRIMARY_GREEN,
    borderColor: PRIMARY_GREEN,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    gap: 2,
  },
  empty: {
    marginTop: 24,
  },
});
