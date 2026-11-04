import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS, SPACING } from '@/constants/layout';
import { getPreference, setPreference } from '@/services/uiPreferences';
import { useThemedStyles, type ThemeColors } from '@/theme';

export interface FirstTimeHintProps {
  /** Names the hint on this phone; once dismissed under this id it never shows again. */
  id: string;
  message: string;
  testID?: string;
}

/**
 * A one-time explanation (VS-94): shown the first time a screen is reached,
 * gone for good once the user taps "Got it". The screen keeps only what is
 * needed every day, and its words of introduction don't stay forever.
 *
 * Shows nothing until the stored choice is read, so it never flashes, and
 * nothing if it cannot be read: a missing hint costs less than a hint that
 * keeps coming back.
 */
export function FirstTimeHint({ id, message, testID }: FirstTimeHintProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');
  const key = `hint.${id}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    let active = true;
    getPreference(key)
      .then((value) => {
        if (active) setShow(value !== 'dismissed');
      })
      .catch(() => {
        // Unreadable: stay hidden.
      });
    return () => {
      active = false;
    };
  }, [key]);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    setPreference(key, 'dismissed').catch(() => {
      // Still gone for this session.
    });
  };

  return (
    <View style={styles.hint} testID={testID}>
      <Typography style={styles.message}>{message}</Typography>
      <Pressable
        accessibilityRole="button"
        onPress={dismiss}
        hitSlop={8}
        testID={testID ? `${testID}-dismiss` : undefined}
      >
        <Typography style={styles.action}>{t('actions.gotIt')}</Typography>
      </Pressable>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: c.PRIMARY_LIGHT,
    },
    message: { flex: 1 },
    action: { color: c.PRIMARY_TEXT, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  });
