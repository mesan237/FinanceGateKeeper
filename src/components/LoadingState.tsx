import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export interface LoadingStateProps {
  /** Line shown under the spinner. Say what is loading, not just "Loading". */
  label?: string;
  testID?: string;
}

/**
 * The app's single spinner treatment, for waits whose result has no predictable
 * shape. Where the shape *is* known — a list of rows, a card of figures —
 * prefer `Skeleton`/`SkeletonRows`, which avoid the layout jump on arrival.
 */
export function LoadingState({ label, testID }: LoadingStateProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  return (
    <View style={styles.container} testID={testID} accessibilityRole="progressbar">
      <ActivityIndicator color={c.PRIMARY_GREEN} />
      {label ? <Typography variant="muted">{label}</Typography> : null}
    </View>
  );
}

const makeStyles = (_c: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
});
