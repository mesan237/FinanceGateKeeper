import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';

import { ProjectDetail } from './ProjectDetail';

/**
 * Reads `?id=<number>` from the route's search params, validates it, and renders
 * `<ProjectDetail>` with a typed prop. Lives in the projects feature (not in
 * `app/`) so the thin-route rule holds — only features may import `expo-router`'s
 * hooks. A stray navigation renders a muted line, not a crash. Mirrors
 * `FundDetailRoute`.
 */
export function ProjectDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;

  if (!valid) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">Invalid project id.</Typography>
      </View>
    );
  }

  return <ProjectDetail projectId={id} />;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
