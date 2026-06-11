import React from 'react';
import { StyleSheet, TextInput as RNTextInput, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { BACKGROUND, TEXT_MUTED, TEXT_PRIMARY } from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';
import { groupDigits } from '@/utils/groupDigits';

export interface AmountInputProps {
  /** The raw amount as a digit-only string (no separators), e.g. "50000". */
  value: string;
  /** Receives the raw digit-only string as the user types. */
  onChangeText: (value: string) => void;
  accessibilityLabel?: string;
  autoFocus?: boolean;
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
  accessibilityLabel = 'Amount in FCFA',
  autoFocus,
  testID,
}: AmountInputProps) {
  const handleChange = (text: string) => {
    onChangeText(text.replace(/\D/g, ''));
  };

  return (
    <View style={styles.wrap}>
      <RNTextInput
        value={value ? groupDigits(value) : ''}
        onChangeText={handleChange}
        placeholder="0"
        placeholderTextColor={TEXT_MUTED}
        keyboardType="numeric"
        accessibilityLabel={accessibilityLabel}
        autoFocus={autoFocus}
        testID={testID}
        style={styles.input}
      />
      <Typography style={styles.suffix}>FCFA</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 8,
    backgroundColor: BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    textAlign: 'right',
    color: TEXT_PRIMARY,
    fontFamily: FONT_FAMILY.POPPINS_BOLD,
    fontSize: 32,
    padding: 0,
  },
  suffix: {
    color: TEXT_MUTED,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
    fontSize: 16,
  },
});
