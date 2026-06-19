import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, type LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { RADIUS } from '@/constants/layout';
import { formatCurrency } from '@/utils/formatCurrency';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { createProject } from './projects.service';

/**
 * Create form for a new project. Frames the project as a goal worth committing
 * to: a short intro, a live preview of how the goal will appear once funded,
 * and labelled fields for name, target, and an optional deadline. On save it
 * creates the project and returns to the Projects tab. (Editing lives in
 * `ProjectDetail`; this form is create-only for now.)
 */
export function ProjectForm() {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Keep the focused field above the keyboard. Android edge-to-edge does not
  // resize the view for the keyboard, so we shrink the scroll area ourselves by
  // the keyboard's height — that makes the form scrollable — then lift the
  // focused field (its y is captured via onLayout) to the top.
  const scrollRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Record<string, number>>({});
  const focusedKey = useRef<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const rememberOffset = (key: string) => (e: LayoutChangeEvent) => {
    fieldOffsets.current[key] = e.nativeEvent.layout.y;
  };
  const scrollToFocused = () => {
    const y = focusedKey.current ? fieldOffsets.current[focusedKey.current] : undefined;
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  };
  const focusField = (key: string) => () => {
    focusedKey.current = key;
    // Field-to-field while the keyboard is already up: scroll immediately.
    scrollToFocused();
  };

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Once the shrunk scroll area has laid out, lift the focused field into view.
  useEffect(() => {
    if (keyboardHeight > 0) scrollToFocused();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardHeight]);

  const parsedTarget = Number(target);
  const hasTarget = Number.isInteger(parsedTarget) && parsedTarget > 0;
  const canSubmit = name.trim().length > 0 && hasTarget && !saving;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createProject({
        name: name.trim(),
        targetAmount: parsedTarget,
        deadline: deadline.trim() === '' ? null : deadline.trim(),
      });
      router.replace('/projects');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create project.');
      setSaving(false);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.scroll, { marginBottom: keyboardHeight }]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader title="New Project" cancelLabel="Cancel" />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="goal" size={26} color={c.PRIMARY_GREEN} />
        </View>
        <Typography variant="heading" style={styles.heroTitle}>
          Set a goal worth funding
        </Typography>
        <Typography variant="muted" style={styles.heroSub}>
          Name what you&apos;re working toward and set a target. Each month a share of your income
          flows here automatically, by priority.
        </Typography>
      </View>

      {/* Live preview — how this goal will appear in your list once created. */}
      <Card style={styles.preview}>
        <View style={styles.previewHeader}>
          <Typography variant="subheading" style={styles.previewName}>
            {name.trim() || 'Your goal'}
          </Typography>
          <Typography variant="muted">New</Typography>
        </View>
        <Typography variant="muted">
          {`${formatCurrency(0)} / ${hasTarget ? formatCurrency(parsedTarget) : '—'}`}
        </Typography>
        <ProgressBar value={0} />
      </Card>

      <View style={styles.field} onLayout={rememberOffset('name')}>
        <Typography variant="label">Goal name</Typography>
        <TextInput
          testID="project-name"
          placeholder="e.g. Emergency car fund"
          value={name}
          onChangeText={setName}
          onFocus={focusField('name')}
          accessibilityLabel="Name"
        />
      </View>

      <View style={styles.field} onLayout={rememberOffset('target')}>
        <Typography variant="label">Target amount (FCFA)</Typography>
        <TextInput
          testID="project-target"
          placeholder="200000"
          keyboardType="number-pad"
          value={target}
          onChangeText={setTarget}
          onFocus={focusField('target')}
          accessibilityLabel="Target amount"
        />
      </View>

      <View style={styles.field} onLayout={rememberOffset('deadline')}>
        <Typography variant="label">Deadline (optional)</Typography>
        <TextInput
          testID="project-deadline"
          placeholder="YYYY-MM-DD"
          value={deadline}
          onChangeText={setDeadline}
          onFocus={focusField('deadline')}
          accessibilityLabel="Deadline"
        />
        <Typography variant="muted" style={styles.help}>
          Add a date to estimate your monthly pace.
        </Typography>
      </View>

      <Button label="Create project" onPress={handleSave} disabled={!canSubmit} />

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: c.PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    textAlign: 'center',
  },
  heroSub: {
    textAlign: 'center',
  },
  preview: {
    gap: 8,
    borderStyle: 'dashed',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewName: {
    flex: 1,
  },
  field: {
    gap: 6,
  },
  help: {
    marginTop: 2,
  },
  error: {
    color: c.DANGER,
  },
});
