import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Skeleton, SkeletonRows } from '@/components/Skeleton';
import { RADIUS, SPACING } from '@/constants/layout';

/**
 * Home's first-load placeholder (UX-16), shaped like the loaded screen — the
 * month hero, the quick-log tiles and a list card — so nothing jumps when the
 * snapshot lands.
 */
export function DashboardSkeleton() {
  return (
    <View style={styles.container} testID="dashboard-skeleton">
      <Skeleton width="45%" height={12} />
      <Card>
        <Skeleton width="35%" height={11} />
        <Skeleton width="60%" height={34} style={styles.gap} />
        <Skeleton height={8} style={styles.gap} />
        <Skeleton width="50%" height={12} style={styles.gap} />
      </Card>
      <View style={styles.tiles}>
        <Skeleton height={64} radius={RADIUS.md} style={styles.tile} />
        <Skeleton height={64} radius={RADIUS.md} style={styles.tile} />
      </View>
      <Card>
        <SkeletonRows count={3} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  gap: {
    marginTop: SPACING.md,
  },
  tiles: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  tile: {
    flex: 1,
  },
});
