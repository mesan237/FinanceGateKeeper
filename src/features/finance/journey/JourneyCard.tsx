import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { SPACING, RADIUS } from '@/constants/layout';
import { ICON_SIZE } from '@/constants/icons';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { JourneyCardSkeleton } from './JourneySkeleton';
import { useJourney } from './journey.hooks';
import { JOURNEY_STEPS } from './journey.steps';

/**
 * The journey on the dashboard (VS-63): which step the user is on, its goal,
 * and five segments for the whole path. Tapping opens the "My path" tab.
 * Holds its place with a placeholder while loading, and shows the shared
 * error card with "Try again" when the journey cannot be read (UX-16).
 */
export function JourneyCard() {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const { t } = useTranslation('journey');
  const { journey, loading, error, refresh } = useJourney();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (journey === null) {
    if (loading) return <JourneyCardSkeleton />;
    return (
      <ErrorState
        compact
        testID="journey-card-error"
        title={t('errors.loadTitle')}
        message={error}
        onRetry={() => void refresh()}
      />
    );
  }
  const number = JOURNEY_STEPS.indexOf(journey.current) + 1;

  return (
    <Pressable testID="journey-card" accessibilityRole="button" onPress={() => router.push('/path')}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Typography variant="muted" style={styles.grow}>
            {t('stepOf', { number, total: JOURNEY_STEPS.length })}
          </Typography>
          <Icon name="forward" size={ICON_SIZE.sm} color={c.TEXT_MUTED} />
        </View>
        <Typography variant="subheading">{t(`steps.${journey.current}.title`)}</Typography>
        <Typography variant="muted">{t(`steps.${journey.current}.goal`)}</Typography>
        {journey.current === 'observe' ? (
          <Typography>
            {t('observe.card', {
              ...journey.observe,
              logged: journey.logging.loggedDays,
              count: journey.logging.daysSoFar,
            })}
          </Typography>
        ) : null}
        <View style={styles.segments}>
          {journey.steps.map((step) => (
            <View
              key={step.key}
              style={[
                styles.segment,
                step.status === 'done' && styles.passed,
                step.status === 'skipped' && styles.skipped,
                step.status === 'current' && styles.current,
              ]}
            />
          ))}
        </View>
      </Card>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: SPACING.xs },
    header: { flexDirection: 'row', alignItems: 'center' },
    grow: { flex: 1 },
    segments: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm },
    segment: { flex: 1, height: 6, borderRadius: RADIUS.full, backgroundColor: c.BORDER },
    passed: { backgroundColor: c.PRIMARY_GREEN },
    skipped: { backgroundColor: c.BORDER_STRONG },
    current: { backgroundColor: c.PRIMARY_LIGHT, borderWidth: 1, borderColor: c.PRIMARY_GREEN },
  });
