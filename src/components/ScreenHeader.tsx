import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE } from '@/constants/icons';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export interface ScreenHeaderProps {
  title: string;
  /** Renders this text label instead of the back chevron icon. */
  cancelLabel?: string;
  rightAction?: React.ReactNode;
}

/**
 * A consistent header for all pushed (non-tab) screens. The left slot is a
 * back chevron or a "Cancel" text label; tapping either calls `router.back()`.
 * An optional right-action slot holds secondary controls (e.g., a gear icon).
 */
export function ScreenHeader({ title, cancelLabel, rightAction }: ScreenHeaderProps) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        testID="screen-header-back"
        accessibilityRole="button"
        accessibilityLabel={cancelLabel ?? 'Back'}
        onPress={() => router.back()}
        hitSlop={8}
        style={styles.backSlot}
      >
        {cancelLabel ? (
          <Typography style={styles.cancelLabel}>{cancelLabel}</Typography>
        ) : (
          <Icon name="back" size={ICON_SIZE.lg} color={c.TEXT_PRIMARY} />
        )}
      </Pressable>

      <Typography testID="screen-header-title" variant="subheading" style={styles.title}>
        {title}
      </Typography>

      <View testID="screen-header-right" style={styles.rightSlot}>
        {rightAction ?? null}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backSlot: {
    minWidth: 40,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  rightSlot: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  cancelLabel: {
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
