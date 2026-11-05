import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ICON_SIZE } from '@/constants/icons';
import { RADIUS, SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { JOURNEY_STEPS } from './journey.steps';
import type { JourneyStep, JourneyStepKey } from './journey.types';

const NODE = 28;

interface JourneyRoadmapProps {
  steps: JourneyStep[];
  /** The open step's working part, shown under its title. */
  renderCurrent: (step: JourneyStep) => React.ReactNode;
  /** Opens a step that isn't the current one in its sheet. */
  onOpen: (key: JourneyStepKey) => void;
}

/**
 * My path drawn as a road (VS-94): one node per step on a vertical line, the
 * line green as far as the user has come. Only the step the user is on is
 * open; every other step is one line (done, skipped, or what it unlocks) and
 * opens in a sheet. Five equal cards made every step look as urgent as the
 * current one.
 */
export function JourneyRoadmap({ steps, renderCurrent, onOpen }: JourneyRoadmapProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation('journey');

  /** The one line a closed step shows: done, skipped, or what reaching it gives. */
  const rowLine = (step: JourneyStep, index: number): string => {
    if (step.status === 'done') return t('status.done');
    if (step.status === 'skipped') return t('roadmap.skippedLine');
    // What the step before unlocks is what this step is; Grow unlocks nothing.
    const before = JOURNEY_STEPS[index - 1] as Exclude<JourneyStepKey, 'grow'> | undefined;
    return before ? t(`steps.${before}.unlocks`) : '';
  };

  return (
    <View testID="journey-roadmap">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const passed = step.status === 'done' || step.status === 'skipped';
        const title = t(`steps.${step.key}.title`);
        const status = t(`status.${step.status}`);
        const rail = (
          <View style={styles.rail}>
            <StepNode step={step} />
            {last ? null : <View style={[styles.line, passed && styles.linePassed]} />}
          </View>
        );

        if (step.status === 'current') {
          return (
            <View key={step.key} style={styles.row} testID={`journey-step-${step.key}`}>
              {rail}
              <View style={[styles.body, styles.currentBody]}>
                <Typography variant="label" style={styles.here}>
                  {status}
                </Typography>
                <Typography variant="subheading">{title}</Typography>
                <Typography variant="muted">{t(`steps.${step.key}.goal`)}</Typography>
                {renderCurrent(step)}
              </View>
            </View>
          );
        }

        return (
          <Pressable
            key={step.key}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${title}, ${status}`}
            onPress={() => onOpen(step.key)}
            testID={`journey-step-${step.key}`}
          >
            {rail}
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Typography style={[styles.title, step.status === 'locked' && styles.lockedTitle]}>
                  {title}
                </Typography>
                <Icon name="forward" size={ICON_SIZE.sm} color={c.TEXT_MUTED} />
              </View>
              <Typography variant="muted" numberOfLines={2}>
                {rowLine(step, index)}
              </Typography>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A step's dot on the line: a check once passed, a lock ahead, a ring where the user is. */
function StepNode({ step }: { step: JourneyStep }) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  if (step.status === 'done') {
    return (
      <View style={[styles.node, styles.nodeDone]}>
        <Icon name="check" size={ICON_SIZE.sm} color={c.TEXT_INVERSE} />
      </View>
    );
  }
  if (step.status === 'current') {
    return (
      <View style={[styles.node, styles.nodeCurrent]}>
        <View style={styles.nodeDot} />
      </View>
    );
  }
  if (step.status === 'skipped') {
    return <View style={[styles.node, styles.nodeSkipped]} />;
  }
  return (
    <View style={[styles.node, styles.nodeLocked]}>
      <Icon name="lock" size={14} color={c.TEXT_MUTED} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: SPACING.md },
    pressed: { opacity: 0.6 },
    rail: { width: NODE, alignItems: 'center' },
    line: { flex: 1, width: 2, minHeight: SPACING.lg, backgroundColor: c.BORDER },
    linePassed: { backgroundColor: c.PRIMARY_FILL },
    node: {
      width: NODE,
      height: NODE,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeDone: { backgroundColor: c.PRIMARY_FILL },
    nodeCurrent: { borderWidth: 2, borderColor: c.PRIMARY_FILL, backgroundColor: c.PRIMARY_LIGHT },
    nodeDot: { width: 10, height: 10, borderRadius: RADIUS.full, backgroundColor: c.PRIMARY_FILL },
    nodeSkipped: { borderWidth: 2, borderStyle: 'dashed', borderColor: c.BORDER_STRONG, backgroundColor: c.SURFACE },
    nodeLocked: { backgroundColor: c.SURFACE_MUTED },
    body: { flex: 1, gap: SPACING.xs, paddingTop: SPACING.xs, paddingBottom: SPACING.lg },
    currentBody: {
      backgroundColor: c.SURFACE,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.PRIMARY_GREEN,
      padding: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    here: { color: c.PRIMARY_TEXT },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    title: { flex: 1, fontSize: 16 },
    lockedTitle: { color: c.TEXT_SECONDARY },
  });
