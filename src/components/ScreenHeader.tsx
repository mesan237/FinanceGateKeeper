import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { PRIMARY_GREEN, TEXT_PRIMARY } from '@/constants/colors';

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

  return (
    <View style={styles.container}>
      <Pressable
        testID="screen-header-back"
        accessibilityRole="button"
        accessibilityLabel={cancelLabel ?? 'Back'}
        onPress={() => router.back()}
        style={styles.backSlot}
      >
        {cancelLabel ? (
          <Typography style={styles.cancelLabel}>{cancelLabel}</Typography>
        ) : (
          <Ionicons name="chevron-back" size={24} color={TEXT_PRIMARY} />
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

const styles = StyleSheet.create({
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
    color: PRIMARY_GREEN,
    fontWeight: '600',
  },
});
