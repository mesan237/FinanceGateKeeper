import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput as RNTextInput, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { groupDigits } from '@/utils/groupDigits';

export interface AmountInputProps {
  /** The raw amount as a digit-only string (no separators), e.g. "50000". */
  value: string;
  /** Receives the raw digit-only string as the user types. */
  onChangeText: (value: string) => void;
  accessibilityLabel?: string;
  autoFocus?: boolean;
  /** Draws the border in the danger colour when the field failed validation. */
  invalid?: boolean;
  testID?: string;
}

/**
 * The hero amount field for transaction forms: a large, right-aligned figure
 * with a dimmed "FCFA" suffix and live thousands grouping ("50 000"). It strips
 * non-digits on input and emits a raw digit string, so callers keep using
 * `Number(value)` exactly as before.
 */
export function AmountInput({
  value,
  onChangeText,
  accessibilityLabel,
  autoFocus,
  invalid = false,
  testID,
}: AmountInputProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation();
  const handleChange = (text: string) => {
    onChangeText(text.replace(/\D/g, ''));
  };

  return (
    <View style={[styles.wrap, invalid && { borderColor: c.DANGER }]}>
      <RNTextInput
        value={value ? groupDigits(value) : ''}
        onChangeText={handleChange}
        placeholder="0"
        placeholderTextColor={c.TEXT_MUTED}
        keyboardType="numeric"
        returnKeyType="done"
        accessibilityLabel={accessibilityLabel ?? t('fields.amountInFcfa')}
        autoFocus={autoFocus}
        testID={testID}
        style={styles.input}
      />
      <Typography style={styles.suffix}>FCFA</Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 8,
    backgroundColor: c.BACKGROUND,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: c.BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    textAlign: 'right',
    color: c.TEXT_PRIMARY,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_BOLD,
    fontSize: 28,
    padding: 0,
  },
  suffix: {
    color: c.TEXT_MUTED,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
    fontSize: 16,
  },
});
