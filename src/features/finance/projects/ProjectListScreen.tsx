import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { RADIUS } from '@/constants/layout';
import { PROJECT_STATUS_LABELS } from '@/constants/projects';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong } from '@/utils/formatDate';

import { useProjects } from './projects.hooks';
import type { Project, TimelineEstimate } from './projects.types';

/**
 * The Projects tab body: funding goals ranked by priority, each with a progress
 * bar and an estimated completion date. "Add project" opens the create form;
 * tapping a row opens its detail. With no projects yet, an aspirational empty
 * state frames the first goal as something worth committing to.
 */
export function ProjectListScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const { projects, timelines, loading, error } = useProjects();

  const goToCreate = () => router.push('/projects/create');

  if (loading) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">Loading…</Typography>
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <View style={styles.emptyIcon}>
          <Icon name="goal" size={40} color={c.PRIMARY_GREEN} />
        </View>
        <Typography variant="heading" style={styles.emptyTitle}>
          Start your first goal
        </Typography>
        <Typography variant="muted" style={styles.emptyText}>
          No projects yet. Add one to start funding it.
        </Typography>
        <Typography variant="muted" style={styles.emptyHint}>
          A car, a business, a safety net — set a target and a share of your income flows toward it
          every month, automatically.
        </Typography>
        <View style={styles.emptyCta}>
          <Button label="Add project" onPress={goToCreate} />
        </View>
        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {projects.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            timeline={timelines.find((t) => t.projectId === project.id)}
            onPress={() => router.push(`/projects/${project.id}`)}
          />
        ))}
      </ScrollView>

      <Button label="Add project" onPress={goToCreate} />

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </View>
  );
}

interface ProjectRowProps {
  project: Project;
  timeline: TimelineEstimate | undefined;
  onPress: () => void;
}

function ProjectRow({ project, timeline, onPress }: ProjectRowProps) {
  const styles = useThemedStyles(makeStyles);
  const pct = Math.min(100, Math.round((project.fundedAmount / project.targetAmount) * 100));
  return (
    <Pressable testID={`project-row-${project.id}`} onPress={onPress}>
      <Card>
        <View style={styles.rowHeader}>
          <Typography variant="subheading">{project.name}</Typography>
          <Typography variant="muted">{PROJECT_STATUS_LABELS[project.status]}</Typography>
        </View>
        <Typography variant="muted">
          {`${formatCurrency(project.fundedAmount)} / ${formatCurrency(project.targetAmount)}`}
        </Typography>
        <ProgressBar value={pct} testID={`project-progress-${project.id}`} />
        <Typography variant="muted" style={styles.eta}>
          {project.status === 'completed'
            ? 'Funded'
            : timeline?.completionDate
              ? `Est. completion: ${formatDateLong(timeline.completionDate)}`
              : 'No funding yet'}
        </Typography>
      </Card>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  list: {
    gap: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eta: {
    color: c.TEXT_MUTED,
    marginTop: 4,
  },
  error: {
    color: c.DANGER,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: c.PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  emptyHint: {
    textAlign: 'center',
    marginTop: 4,
  },
  emptyCta: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
});
