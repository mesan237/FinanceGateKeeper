import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

/** The three stages the first screen shows (VS-87); My path details all five steps. */
const STAGES = ['now', 'after', 'then'] as const;

/**
 * The first set-up screen's timeline (VS-87): what the user does now, what
 * they plan once three complete months are in, and what they optimize after.
 * Only "now" is emphasised, with the complete-month rule beneath it; the
 * stages ahead read muted, and the early-budget option closes the screen as a
 * single quiet line, so nothing competes with the headline or the button.
 */
export function OnboardingIntro() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('onboarding');

  return (
    <View style={styles.container}>
      <View style={styles.stages}>
        {STAGES.map((stage, i) => {
          const current = stage === 'now';
          return (
            <View
              key={stage}
              testID={`onboarding-stage-${stage}`}
              accessible
              accessibilityState={{ selected: current }}
              style={styles.row}
            >
              <View style={[styles.marker, current ? styles.markerCurrent : styles.markerAhead]}>
                <Typography style={current ? styles.markerTextCurrent : styles.markerTextAhead}>{i + 1}</Typography>
              </View>
              <View style={styles.grow}>
                <Typography variant="muted" style={styles.when}>
                  {t(`intro.stages.${stage}.when`)}
                </Typography>
                <Typography variant="subheading" style={current ? undefined : styles.ahead}>
                  {t(`intro.stages.${stage}.title`)}
                </Typography>
                <Typography style={current ? styles.body : styles.ahead}>{t(`intro.stages.${stage}.body`)}</Typography>
                {current ? (
                  <Typography variant="muted" style={styles.note}>
                    {t('intro.observeNote')}
                  </Typography>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <Typography variant="muted" style={styles.note}>
        {t('intro.early')}
      </Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: SPACING.xl,
    },
    stages: {
      gap: SPACING.lg,
    },
    row: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    marker: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    markerCurrent: {
      backgroundColor: c.PRIMARY_TEXT,
    },
    markerAhead: {
      borderWidth: 1,
      borderColor: c.BORDER,
    },
    markerTextCurrent: {
      color: c.BACKGROUND,
      fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
      fontSize: 13,
    },
    markerTextAhead: {
      color: c.TEXT_SECONDARY,
      fontSize: 13,
    },
    grow: {
      flex: 1,
      gap: 2,
    },
    when: {
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    body: {
      color: c.TEXT_PRIMARY,
    },
    ahead: {
      color: c.TEXT_SECONDARY,
    },
    note: {
      fontSize: 13,
      lineHeight: 19,
      marginTop: SPACING.xs,
    },
  });
