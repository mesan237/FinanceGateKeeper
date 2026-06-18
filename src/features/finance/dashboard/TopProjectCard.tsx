import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { formatCurrency } from '@/utils/formatCurrency';

import type { TopProject } from './dashboard.types';

interface TopProjectCardProps {
  topProject: TopProject;
}

/**
 * The most pressing active project on the dashboard: its name, funded-of-target
 * amounts, and a progress bar — mirroring the Funds card so the user can read
 * its standing the same way.
 */
export function TopProjectCard({ topProject }: TopProjectCardProps) {
  const { project, pct } = topProject;

  return (
    <Card testID="top-project-card">
      <Typography variant="label">Top Project</Typography>
      <Typography variant="subheading" style={styles.name}>
        {project.name}
      </Typography>
      <ProgressBar value={pct} animated testID="top-project-progress" style={styles.bar} />
      <View style={styles.metaRow}>
        <Typography variant="muted">
          {`${formatCurrency(project.fundedAmount)} of ${formatCurrency(project.targetAmount)}`}
        </Typography>
        <Typography variant="muted" style={styles.pct}>{`${pct}%`}</Typography>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  name: {
    marginTop: 4,
    marginBottom: 10,
  },
  bar: {
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pct: {
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
