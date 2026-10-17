import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';

import { GoalForm } from './GoalForm';

/**
 * Reads `?id=<number>` and opens the goal form in edit mode. Lives in the
 * feature so only features touch `expo-router` hooks; a stray id renders a
 * muted line rather than a crash.
 */
export function GoalFormRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation('goals');
  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">{t('errors.invalidId')}</Typography>
      </View>
    );
  }

  return <GoalForm goalId={id} />;
}

const styles = StyleSheet.create({
  container: { padding: 16 },
});
