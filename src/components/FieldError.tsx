import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ICON_SIZE } from '@/constants/icons';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export interface FieldErrorProps {
  /** The message to show; nothing renders when it is empty or undefined. */
  message?: string | null;
  testID?: string;
}

/**
 * An inline validation message (alert icon + danger text) placed directly under
 * the form field it describes. Renders nothing when there is no message, so a
 * caller can mount it unconditionally.
 */
export function FieldError({ message, testID }: FieldErrorProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  if (!message) return null;
  return (
    <View style={styles.row} testID={testID} accessibilityLiveRegion="polite">
      <Icon name="alert" size={ICON_SIZE.sm} color={c.DANGER} />
      <Typography style={styles.text}>{message}</Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
  },
  text: {
    color: c.DANGER,
    fontSize: 13,
  },
});
