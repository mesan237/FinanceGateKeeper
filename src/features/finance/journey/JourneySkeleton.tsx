import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { RADIUS, SPACING } from '@/constants/layout';

/** Steps drawn by the "My path" placeholder: one per step on the path. */
const STEP_COUNT = 5;

/** The step card's outline: a title row with its status pill, then the goal line. */
function StepOutline() {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Skeleton width="45%" height={16} />
        <Skeleton width={72} height={20} radius={RADIUS.full} />
      </View>
      <Skeleton width="80%" height={12} />
    </Card>
  );
}

/**
 * "My path" while the journey loads (UX-16): the intro line and the five step
 * cards in outline, so the page settles in place when the journey lands.
 */
export function JourneySkeleton() {
  return (
    <View style={styles.body} testID="journey-skeleton">
      <Skeleton width="85%" height={12} />
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <StepOutline key={i} />
      ))}
    </View>
  );
}

/** Home's path card while the journey loads (UX-16): step line, title, goal and the five segments. */
export function JourneyCardSkeleton() {
  return (
    <Card style={styles.card} testID="journey-card-skeleton">
      <Skeleton width="30%" height={12} />
      <Skeleton width="40%" height={16} />
      <Skeleton width="75%" height={12} />
      <View style={styles.segments}>
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <Skeleton key={i} height={6} radius={RADIUS.full} style={styles.segment} />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { padding: SPACING.lg, gap: SPACING.md },
  card: { gap: SPACING.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segments: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs },
  segment: { flex: 1 },
});
