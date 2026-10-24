import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ICON_SIZE } from '@/constants/icons';
import { RADIUS, SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export interface ErrorStateProps {
  /** Re-runs the failed load. Every error state offers it: there is no dead end. */
  onRetry: () => void;
  /** What failed, in the user's words. Defaults to "Couldn't load this". */
  title?: string;
  /** The underlying message, shown small beneath the reassurance. */
  message?: string | null;
  /** A card-sized row for a section inside a screen, instead of the full block. */
  compact?: boolean;
  testID?: string;
}

/**
 * The one error treatment for the whole app (UX-16): what failed, that nothing
 * logged is lost, and a "Try again" that re-runs the load. The full form takes
 * the place of a screen's content; the compact form stands in for one card.
 */
export function ErrorState({ onRetry, title, message, compact = false, testID }: ErrorStateProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation('common');
  const heading = title ?? t('states.errorTitle');
  const retry = (
    <Button
      label={t('actions.retry')}
      variant="secondary"
      compact={compact}
      onPress={onRetry}
      testID={testID ? `${testID}-retry` : undefined}
    />
  );
  const detail = message ? (
    <Typography variant="muted" style={styles.detail} testID={testID ? `${testID}-detail` : undefined}>
      {message}
    </Typography>
  ) : null;

  if (compact) {
    return (
      <Card testID={testID} style={styles.compact}>
        <View style={styles.compactRow}>
          <Icon name="alert" size={ICON_SIZE.md} color={c.DANGER_TEXT} />
          <View style={styles.compactBody}>
            <Typography variant="body">{heading}</Typography>
            <Typography variant="muted">{t('states.errorBody')}</Typography>
          </View>
        </View>
        {detail}
        <View style={styles.compactAction}>{retry}</View>
      </Card>
    );
  }

  return (
    <View style={styles.container} testID={testID} accessibilityRole="alert">
      <View style={styles.badge}>
        <Icon name="alert" size={ICON_SIZE.lg} color={c.DANGER_TEXT} />
      </View>
      <Typography variant="subheading" style={styles.centred}>
        {heading}
      </Typography>
      <Typography variant="muted" style={styles.centred}>
        {t('states.errorBody')}
      </Typography>
      {detail}
      <View style={styles.actions}>{retry}</View>
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
    backgroundColor: c.DANGER_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  centred: {
    textAlign: 'center',
    maxWidth: 300,
  },
  detail: {
    fontSize: 12,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: SPACING.md,
  },
  compact: {
    gap: SPACING.sm,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  compactBody: {
    flex: 1,
    gap: 2,
  },
  compactAction: {
    flexDirection: 'row',
  },
});
