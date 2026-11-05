import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';

import { JOURNEY_STEPS } from './journey.steps';
import type { JourneyStep, JourneyStepKey } from './journey.types';

interface JourneyStepSheetProps {
  /** The step opened from the roadmap; null keeps the sheet closed. */
  step: JourneyStep | null;
  /** Whether the step is the next one, the only one that can be skipped to. */
  canSkip: boolean;
  /** Whether the user is still observing: skipping then gets the extra warning. */
  observing: boolean;
  /** A skipped step's working part, so it can still be finished. */
  renderDetail: (step: JourneyStep) => React.ReactNode;
  onSkip: (key: JourneyStepKey) => void;
  onClose: () => void;
}

/**
 * A step of My path opened from its row (VS-94): its goal, where it stands and
 * what it unlocks; a skipped step's work, which can still be done; and, for
 * the next step, "Skip to this step". The skip warning replaces the sheet's
 * content rather than opening over it: sheets are never stacked.
 */
export function JourneyStepSheet({
  step,
  canSkip,
  observing,
  renderDetail,
  onSkip,
  onClose,
}: JourneyStepSheetProps) {
  const { t } = useTranslation(['journey', 'common']);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setConfirming(false);
  }, [step?.key]);

  if (step === null) return null;

  const unlocks =
    step.key === 'grow' ? null : t(`steps.${step.key as Exclude<JourneyStepKey, 'grow'>}.unlocks`);
  const number = JOURNEY_STEPS.indexOf(step.key) + 1;

  return (
    <BottomSheet visible onClose={onClose} testID="journey-step-sheet">
      {confirming ? (
        <View style={styles.body}>
          <Typography variant="subheading">{t('skip.title')}</Typography>
          <Typography variant="muted">{t('skip.body')}</Typography>
          {observing ? <Typography>{t('skip.observeWarning')}</Typography> : null}
          <Button
            testID="journey-skip-confirm"
            label={t('skip.confirm')}
            onPress={() => {
              onClose();
              onSkip(step.key);
            }}
          />
          <Button label={t('common:actions.cancel')} variant="secondary" onPress={() => setConfirming(false)} />
        </View>
      ) : (
        <View style={styles.body}>
          <Typography variant="muted">{t('stepOf', { number, total: JOURNEY_STEPS.length })}</Typography>
          <Typography variant="subheading">{t(`steps.${step.key}.title`)}</Typography>
          <Typography testID="journey-step-sheet-status" variant="label">
            {t(`status.${step.status}`)}
          </Typography>
          <Typography>{t(`steps.${step.key}.goal`)}</Typography>
          {unlocks ? <Typography variant="muted">{unlocks}</Typography> : null}
          {step.status === 'skipped' ? renderDetail(step) : null}
          {canSkip ? (
            <Button
              testID={`journey-skip-${step.key}`}
              label={t('skip.action')}
              variant="secondary"
              onPress={() => setConfirming(true)}
            />
          ) : null}
          <Button label={t('common:actions.close')} variant="ghost" onPress={onClose} />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACING.sm },
});
