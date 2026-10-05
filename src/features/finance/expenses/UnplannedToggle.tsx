import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Toggle } from '@/components/Toggle';
import { Typography } from '@/components/Typography';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

export interface UnplannedToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
}

/**
 * The "Unplanned" (imprévu) switch on the expense forms: a label, a one-line
 * hint, and the switch. Off by default, so only the spending the user marks
 * counts as an imprévu.
 */
export function UnplannedToggle({ value, onValueChange, testID }: UnplannedToggleProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('expenses');

  return (
    <View style={[styles.row, value && styles.rowOn]}>
      <View style={styles.text}>
        <Typography>{t('entry.unplanned')}</Typography>
        <Typography variant="muted" style={styles.hint}>
          {t('entry.unplannedHint')}
        </Typography>
      </View>
      <Toggle
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={t('entry.unplanned')}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.BORDER_STRONG,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    rowOn: {
      borderColor: c.WARNING,
      backgroundColor: c.WARNING_LIGHT,
    },
    text: { flex: 1 },
    hint: { fontSize: 12, marginTop: 2 },
  });
