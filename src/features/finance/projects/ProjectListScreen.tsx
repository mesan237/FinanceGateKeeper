import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { DANGER, TEXT_MUTED } from '@/constants/colors';
import { PROJECT_STATUS_LABELS } from '@/constants/projects';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong } from '@/utils/formatDate';

import { useProjects } from './projects.hooks';
import type { Project, TimelineEstimate } from './projects.types';

/**
 * The Projects tab body: funding goals ranked by priority, each with a progress
 * bar and an estimated completion date. "Add project" opens the create form;
 * tapping a row opens its detail.
 */
export function ProjectListScreen() {
  const router = useRouter();
  const { projects, timelines, loading, error } = useProjects();

  return (
    <View style={styles.container}>
      <Typography variant="heading">Projects</Typography>

      {loading ? (
        <Typography variant="muted">Loading…</Typography>
      ) : projects.length === 0 ? (
        <Typography variant="muted">No projects yet. Add one to start funding it.</Typography>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              timeline={timelines.find((t) => t.projectId === project.id)}
              onPress={() => router.push(`/projects/${project.id}`)}
            />
          ))}
        </ScrollView>
      )}

      <Button label="Add project" onPress={() => router.push('/projects/create')} />

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

const styles = StyleSheet.create({
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
    color: TEXT_MUTED,
    marginTop: 4,
  },
  error: {
    color: DANGER,
  },
});
