import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

export type PillTone = 'neutral' | 'success' | 'danger' | 'warning';

export interface PillProps extends ViewProps {
  label: string;
  /** Colour tone of the chip. Defaults to a muted neutral. */
  tone?: PillTone;
}

/** A small rounded status chip — for current values, modes, or totals. */
export function Pill({ label, tone = 'neutral', style, ...rest }: PillProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.pill, styles[tone], style]} {...rest}>
      <Typography style={[styles.text, styles[`${tone}Text`]]}>{label}</Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  pill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  text: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  neutral: { backgroundColor: c.SURFACE_MUTED },
  neutralText: { color: c.TEXT_PRIMARY },
  success: { backgroundColor: c.SUCCESS_LIGHT },
  successText: { color: c.SUCCESS_TEXT },
  danger: { backgroundColor: c.DANGER_LIGHT },
  dangerText: { color: c.DANGER_TEXT },
  warning: { backgroundColor: c.WARNING_LIGHT },
  warningText: { color: c.WARNING_TEXT },
});
