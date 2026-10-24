import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { LoadingState } from '@/components/LoadingState';
import { Modal } from '@/components/Modal';
import { Pill, type PillTone } from '@/components/Pill';
import { Typography } from '@/components/Typography';
import { ICON_SIZE } from '@/constants/icons';
import { SPACING } from '@/constants/layout';
import { BaselineCard } from '@/features/finance/budget/BaselineCard';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { JourneyStepDetail } from './JourneyStepDetail';
import { useJourney } from './journey.hooks';
import { JOURNEY_STEPS } from './journey.steps';
import type { JourneyStep, JourneyStepKey, JourneyStepStatus } from './journey.types';

const TONE: Record<JourneyStepStatus, PillTone> = {
  done: 'success',
  skipped: 'warning',
  current: 'success',
  locked: 'neutral',
};

/**
 * "My path" (VS-63): the five steps to control, each with where it stands.
 * The current step (and any skipped one) shows its progress and next action;
 * a locked step is a preview of what it unlocks, and the next one can be
 * skipped to after a warning. The setup checklist sits on top until it is done.
 */
export function JourneyScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation(['journey', 'common']);
  const { journey, loading, error, refresh, reviewPicture, skipTo } = useJourney();
  const [skipping, setSkipping] = useState<JourneyStepKey | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (loading) return <LoadingState label={t('loading')} />;
  if (journey === null) {
    return (
      <View style={styles.screen}>
        <Typography style={styles.error}>{error ?? t('errors.load')}</Typography>
      </View>
    );
  }

  const nextIndex = JOURNEY_STEPS.indexOf(journey.current) + 1;

  const renderStep = (step: JourneyStep, index: number) => {
    const open = step.status === 'current' || step.status === 'skipped';
    // A preview names what the step before it unlocks: that is what this step is.
    // Grow is last, so it never unlocks anything.
    const before = index > 0 ? (JOURNEY_STEPS[index - 1] as Exclude<JourneyStepKey, 'grow'>) : null;
    const unlocks = before ? t(`steps.${before}.unlocks`) : '';
    return (
      <Card
        key={step.key}
        testID={`journey-step-${step.key}`}
        style={[styles.card, step.status === 'current' && styles.currentCard]}
      >
        <View style={styles.header}>
          <Icon
            name={step.status === 'locked' ? 'lock' : step.status === 'done' ? 'check' : 'circle'}
            size={ICON_SIZE.sm}
            color={step.status === 'done' ? c.SUCCESS : c.TEXT_MUTED}
          />
          <Typography variant="subheading" style={styles.grow}>
            {t(`steps.${step.key}.title`)}
          </Typography>
          <Pill label={t(`status.${step.status}`)} tone={TONE[step.status]} />
        </View>
        <Typography variant="muted">{t(`steps.${step.key}.goal`)}</Typography>
        {step.status === 'locked' && unlocks ? <Typography variant="muted">{unlocks}</Typography> : null}
        {open ? <JourneyStepDetail step={step.key} journey={journey} onReviewed={() => void reviewPicture()} /> : null}
        {step.status === 'locked' && index === nextIndex ? (
          <Button
            testID={`journey-skip-${step.key}`}
            label={t('skip.action')}
            variant="ghost"
            compact
            onPress={() => setSkipping(step.key)}
          />
        ) : null}
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <Typography variant="muted">{t('intro')}</Typography>
        <BaselineCard />
        {journey.steps.map(renderStep)}
      </ScrollView>

      <Modal visible={skipping !== null} onRequestClose={() => setSkipping(null)}>
        <View style={styles.modal}>
          <Typography variant="subheading">{t('skip.title')}</Typography>
          <Typography variant="muted">{t('skip.body')}</Typography>
          {journey.current === 'observe' ? <Typography>{t('skip.observeWarning')}</Typography> : null}
          <Button
            testID="journey-skip-confirm"
            label={t('skip.confirm')}
            onPress={() => {
              const target = skipping;
              setSkipping(null);
              if (target) void skipTo(target);
            }}
          />
          <Button label={t('common:actions.cancel')} variant="secondary" onPress={() => setSkipping(null)} />
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.BACKGROUND },
    body: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
    card: { gap: SPACING.xs },
    currentCard: { borderWidth: 1, borderColor: c.PRIMARY_GREEN },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    grow: { flex: 1 },
    error: { color: c.DANGER, padding: SPACING.lg },
    modal: { gap: SPACING.md },
  });
