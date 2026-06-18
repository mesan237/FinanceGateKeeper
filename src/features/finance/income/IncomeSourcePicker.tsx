import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { INCOME_SOURCES, type IncomeSource } from '@/constants/incomeSources';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { RADIUS } from '@/constants/layout';

export interface IncomeSourcePickerProps {
  value: IncomeSource | null;
  onChange: (source: IncomeSource) => void;
}

/**
 * Visual source selector: one pill per `INCOME_SOURCES` entry, laid out in a
 * row. The selected pill is filled with `c.PRIMARY_GREEN`; the others are
 * outlined. Selection state is exposed via `accessibilityState.selected`.
 */
export function IncomeSourcePicker({ value, onChange }: IncomeSourcePickerProps) {
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: c.PRIMARY_GREEN,
  },
  pillActive: {
    backgroundColor: c.PRIMARY_GREEN,
    borderColor: c.PRIMARY_GREEN,
  },
  pillTextActive: {
    color: c.TEXT_INVERSE,
  },
});
