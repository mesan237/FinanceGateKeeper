import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { RADIUS, SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export interface EmptyStateProps {
  /** Glyph shown in the tinted badge above the title. */
  icon: IconName;
  title: string;
  /** One or two lines explaining what would fill this space, and why it's worth it. */
  subtitle?: string;
  /** Primary call to action. Omit for states the user cannot act on. */
  actionLabel?: string;
  onAction?: () => void;
  /** Secondary, lower-emphasis escape hatch beneath the primary action. */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  testID?: string;
}

/**
 * The one empty-state treatment for the whole app: a tinted icon badge, a title,
 * an explanatory line, and an optional call to action.
 *
 * An empty screen is the user's first impression of a feature, so it says what
 * the space is for and offers the one action that fills it — never a bare
 * "No data" line.
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  testID,
}: EmptyStateProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.badge}>
        <Icon name={icon} size={ICON_SIZE.lg} color={c.PRIMARY_GREEN} />
      </View>
      <Typography variant="subheading" style={styles.title}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="muted" style={styles.subtitle}>
          {subtitle}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.actions}>
          <Button label={actionLabel} onPress={onAction} testID={testID ? `${testID}-action` : undefined} />
          {secondaryActionLabel && onSecondaryAction ? (
            <Button
              label={secondaryActionLabel}
              variant="ghost"
              onPress={onSecondaryAction}
              testID={testID ? `${testID}-secondary` : undefined}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: c.PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 19,
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
});
