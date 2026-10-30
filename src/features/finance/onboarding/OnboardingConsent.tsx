import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Toggle } from '@/components/Toggle';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { useAnalyticsConsent } from '@/hooks/useAnalyticsConsent';

/**
 * The optional-analytics switch on the set-up's first step (VS-90). Off by
 * default: nothing is sent unless the user turns it on, and the same choice
 * shows in Preferences, where it can be changed at any time. A failed save
 * leaves the switch off, so it never claims a choice that was not kept.
 */
export function OnboardingConsent() {
  const { t } = useTranslation('common');
  const { enabled, setEnabled } = useAnalyticsConsent('onboarding');

  const toggle = (next: boolean) => {
    setEnabled(next).catch((e: unknown) => console.error('Saving the analytics choice failed:', e));
  };

  return (
    <View style={styles.row} testID="onboarding-analytics">
      <View style={styles.text}>
        <Typography variant="label">{t('analytics.title')}</Typography>
        <Typography variant="muted" style={styles.body}>
          {t('analytics.body')}
        </Typography>
      </View>
      <Toggle
        testID="onboarding-analytics-switch"
        value={enabled}
        onValueChange={toggle}
        accessibilityLabel={t('analytics.title')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  text: {
    flex: 1,
    gap: SPACING.xs,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
});
