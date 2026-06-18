import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { RADIUS } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { PROJECT_RECOVERY_DAYS } from './projects.service';
import { useDeletedProjects } from './projects.hooks';
import type { DeletedProject } from './projects.types';

/** Whole days left before a soft-deleted project is purged (clamped at 0). */
function daysLeft(deletedAt: string, now: Date = new Date()): number {
  const purgeAt = new Date(deletedAt).getTime() + PROJECT_RECOVERY_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - now.getTime()) / (24 * 60 * 60 * 1000)));
}

/** Human label for the remaining recovery window. */
function recoveryLabel(days: number): string {
  if (days <= 0) return 'Removed soon';
  return `Deletes in ${days} day${days === 1 ? '' : 's'}`;
}

/**
 * The recycle bin: projects soft-deleted within the last
 * {@link PROJECT_RECOVERY_DAYS} days, each restorable until it is purged.
 */
export function DeletedProjectsScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { deleted, loading, restore } = useDeletedProjects();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Recently Deleted" />

      {loading ? (
        <Typography variant="muted">Loading…</Typography>
      ) : deleted.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="delete" size={32} color={c.TEXT_MUTED} />
          </View>
          <Typography variant="muted" style={styles.emptyText}>
            Nothing here. Deleted projects stay for {PROJECT_RECOVERY_DAYS} days so you can recover
            them before they&apos;re removed for good.
          </Typography>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {deleted.map((project) => (
            <DeletedRow key={project.id} project={project} onRestore={() => restore(project.id)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function DeletedRow({ project, onRestore }: { project: DeletedProject; onRestore: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const days = daysLeft(project.deletedAt);
  return (
    <Card testID={`deleted-project-${project.id}`} style={styles.card}>
      <View style={styles.cardBody}>
        <Typography variant="subheading">{project.name}</Typography>
        <Pill label={recoveryLabel(days)} tone={days <= 1 ? 'danger' : 'warning'} />
      </View>
      <Button
        label="Restore"
        variant="secondary"
        compact
        testID={`restore-${project.id}`}
        onPress={onRestore}
      />
    </Card>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardBody: {
    flex: 1,
    gap: 6,
    alignItems: 'flex-start',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: c.SURFACE_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
