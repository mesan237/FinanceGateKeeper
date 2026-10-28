import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import type { AppLanguage } from '@/i18n/resolveLanguage';
import { useThemedStyles, type ThemeColors } from '@/theme';

export interface LanguageToggleProps {
  value: AppLanguage;
  onChange: (language: AppLanguage) => void;
  testID?: string;
}

const LANGUAGES: ReadonlyArray<{ key: AppLanguage; short: 'shortFr' | 'shortEn' }> = [
  { key: 'fr', short: 'shortFr' },
  { key: 'en', short: 'shortEn' },
];

/**
 * A compact FR | EN switch for places where a full `SegmentedControl` would
 * compete with the content, such as the first-run set-up's header (VS-86). The
 * active language is underlined in the primary text colour; each code is read
 * out as the language's own name ("Français", "English") and is a 44pt target.
 */
export function LanguageToggle({ value, onChange, testID }: LanguageToggleProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');

  return (
    <View style={styles.row} accessibilityLabel={t('languages.label')} testID={testID}>
      {LANGUAGES.map(({ key, short }, i) => {
        const active = key === value;
        return (
          <React.Fragment key={key}>
            {i > 0 ? <Typography style={styles.divider}>|</Typography> : null}
            <Pressable
              testID={testID ? `${testID}-${key}` : undefined}
              accessibilityRole="button"
              accessibilityLabel={t(`languages.${key}`)}
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (!active) onChange(key);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              style={styles.option}
            >
              <Typography style={[styles.code, active ? styles.active : styles.inactive]}>
                {t(`languages.${short}`)}
              </Typography>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
    },
    option: {
      minWidth: 28,
      minHeight: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    code: {
      fontSize: 14,
    },
    active: {
      color: c.PRIMARY_TEXT,
      fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
      textDecorationLine: 'underline',
    },
    inactive: {
      color: c.TEXT_SECONDARY,
    },
    divider: {
      color: c.BORDER,
    },
  });
