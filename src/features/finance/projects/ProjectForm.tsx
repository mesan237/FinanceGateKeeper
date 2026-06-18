import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';


import { createProject } from './projects.service';

/**
 * Create form for a new project: name, target amount, and an optional deadline.
 * On save it creates the project and returns to the Projects tab. (Editing an
 * existing project lives in `ProjectDetail`; this form is create-only for now.)
 */
export function ProjectForm() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsedTarget = Number(target);
  const canSubmit =
    name.trim().length > 0 && Number.isInteger(parsedTarget) && parsedTarget > 0 && !saving;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createProject({
        name: name.trim(),
        targetAmount: parsedTarget,
        deadline: deadline.trim() === '' ? null : deadline.trim(),
      });
      router.replace('/(tabs)/projects');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create project.');
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="New Project" cancelLabel="Cancel" />

      <TextInput
        testID="project-name"
        placeholder="Name"
        value={name}
        onChangeText={setName}
        accessibilityLabel="Name"
      />
      <TextInput
        testID="project-target"
        placeholder="Target amount (FCFA)"
        keyboardType="number-pad"
        value={target}
        onChangeText={setTarget}
        accessibilityLabel="Target amount"
      />
      <TextInput
        testID="project-deadline"
        placeholder="Deadline (YYYY-MM-DD, optional)"
        value={deadline}
        onChangeText={setDeadline}
        accessibilityLabel="Deadline"
      />

      <Button label="Save" onPress={handleSave} disabled={!canSubmit} />

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  error: {
    color: c.DANGER,
  },
});
