import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

/** A label with a right-aligned FCFA amount, the row the report sections are made of. */
export function ReportRow({
  label,
  value,
  color,
  testID,
}: {
  label: string;
  value: number;
  color?: string;
  testID?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row} testID={testID}>
      <Typography variant="body">{label}</Typography>
      <Typography variant="body" style={color ? { color } : undefined}>
        {formatCurrency(value)}
      </Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.BORDER,
      paddingVertical: 8,
    },
  });
