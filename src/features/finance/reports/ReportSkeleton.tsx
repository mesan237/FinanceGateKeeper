import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Skeleton, SkeletonRows } from '@/components/Skeleton';
import { SPACING } from '@/constants/layout';

/**
 * The monthly report on a first load (UX-16), shaped like the loaded page —
 * the in/out summary, the plan bar and the category rows — so nothing jumps
 * when the month lands.
 */
export function ReportSkeleton() {
  return (
    <View style={styles.container} testID="report-skeleton">
      <Card>
        <View style={styles.summary}>
          <View style={styles.half}>
            <Skeleton width="50%" height={11} />
            <Skeleton width="80%" height={20} />
          </View>
          <View style={[styles.half, styles.end]}>
            <Skeleton width="50%" height={11} />
            <Skeleton width="80%" height={20} />
          </View>
        </View>
      </Card>
      <Skeleton width="40%" height={16} />
      <Skeleton height={8} />
      <SkeletonRows count={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.lg },
  summary: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { flex: 1, gap: SPACING.sm },
  end: { alignItems: 'flex-end' },
});
