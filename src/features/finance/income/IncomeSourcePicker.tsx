import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { INCOME_SOURCES, type IncomeSource } from '@/constants/incomeSources';
import { PRIMARY_GREEN } from '@/constants/colors';

export interface IncomeSourcePickerProps {
  value: IncomeSource | null;
  onChange: (source: IncomeSource) => void;
}

/**
 * Visual source selector: one pill per `INCOME_SOURCES` entry, laid out in a
 * row. The selected pill is filled with `PRIMARY_GREEN`; the others are
 * outlined. Selection state is exposed via `accessibilityState.selected`.
 */
export function IncomeSourcePicker({ value, onChange }: IncomeSourcePickerProps) {
  return (
    <View style={styles.row}>
      {INCOME_SOURCES.map(({ value: source, label }) => {
        const active = value === source;
        return (
          <Pressable
            key={source}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(source)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Typography style={active ? styles.pillTextActive : undefined}>{label}</Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PRIMARY_GREEN,
  },
  pillActive: {
    backgroundColor: PRIMARY_GREEN,
    borderColor: PRIMARY_GREEN,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
});
