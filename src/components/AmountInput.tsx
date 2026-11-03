import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput as RNTextInput, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { appendOperator, evaluateAmount, formatExpression, type AmountOperator } from '@/utils/amountExpression';
import { groupDigits } from '@/utils/groupDigits';

export interface AmountInputProps {
  /** The raw amount as a digit-only string (no separators), e.g. "50000". */
  value: string;
  /** Receives the raw digit-only string as the user types: the total when a sum is typed. */
  onChangeText: (value: string) => void;
  accessibilityLabel?: string;
  autoFocus?: boolean;
  /** Draws the border in the danger colour when the field failed validation. */
  invalid?: boolean;
  testID?: string;
}

/** The operator keys, in the order shown, with their catalogue key. */
const KEYS: readonly { operator: AmountOperator; name: 'plus' | 'minus' | 'times' | 'dividedBy' }[] = [
  { operator: '+', name: 'plus' },
  { operator: '−', name: 'minus' },
  { operator: '×', name: 'times' },
  { operator: '÷', name: 'dividedBy' },
];

/** The digits a form receives for some typed text: the whole-FCFA total, or empty. */
function digitsOf(text: string): string {
  const { total } = evaluateAmount(text);
  return total === null ? '' : String(total);
}

/**
 * The hero amount field for transaction forms: a large, right-aligned figure
 * with a dimmed "FCFA" suffix and live thousands grouping ("50 000").
 *
 * It also calculates (VS-93): the user can type a sum such as "350 × 2 + 200"
 * for two taxi rides and a moto, and the total shows beneath it. While the field
 * is focused, a row of + − × ÷ = keys stands in for the operators that phone
 * number pads lack. "=" or leaving the field collapses the sum to its total, so
 * what is shown is what is saved. Callers still receive a raw digit string,
 * always the whole-FCFA total, and keep using `Number(value)` exactly as before.
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
  const input = useRef<RNTextInput>(null);
  const [text, setText] = useState(() => (value ? groupDigits(value) : ''));
  const [focused, setFocused] = useState(false);

  // A form that sets or clears its amount (an edit screen loading, a save
  // resetting the field) replaces whatever sum is on screen.
  useEffect(() => {
    setText((current) => (digitsOf(current) === value ? current : value ? groupDigits(value) : ''));
  }, [value]);

  const show = (next: string) => {
    setText(next);
    onChangeText(digitsOf(next));
  };
  const collapse = () => {
    const digits = digitsOf(text);
    setText(digits ? groupDigits(digits) : '');
  };

  const { total, isCalculation, rounded } = evaluateAmount(text);
  const prefix = rounded ? '≈' : '=';

  return (
    <View style={styles.container}>
      <View style={[styles.wrap, invalid && { borderColor: c.DANGER }]}>
        <RNTextInput
          ref={input}
          value={text}
          onChangeText={(raw) => show(formatExpression(raw))}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            collapse();
          }}
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

      {isCalculation ? (
        <Typography
          testID={testID ? `${testID}-result` : undefined}
          accessibilityLiveRegion="polite"
          style={total === null ? styles.noTotal : styles.result}
        >
          {total === null ? t('calc.noTotal') : `${prefix} ${groupDigits(String(total))} FCFA`}
        </Typography>
      ) : null}

      {focused ? (
        <View style={styles.keys}>
          {KEYS.map(({ operator, name }) => (
            <Pressable
              key={name}
              testID={testID ? `${testID}-key-${name}` : undefined}
              accessibilityRole="button"
              accessibilityLabel={t(`calc.${name}`)}
              onPress={() => {
                show(appendOperator(text, operator));
                input.current?.focus();
              }}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            >
              <Typography style={styles.keyText}>{operator}</Typography>
            </Pressable>
          ))}
          <Pressable
            testID={testID ? `${testID}-key-equals` : undefined}
            accessibilityRole="button"
            accessibilityLabel={t('calc.equals')}
            onPress={collapse}
            style={({ pressed }) => [styles.key, styles.keyEquals, pressed && styles.keyPressed]}
          >
            <Typography style={[styles.keyText, styles.keyEqualsText]}>=</Typography>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    gap: 6,
  },
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
  result: {
    textAlign: 'right',
    color: c.TEXT_SECONDARY,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  noTotal: {
    textAlign: 'right',
    color: c.DANGER_TEXT,
    fontSize: 13,
  },
  keys: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: c.BORDER,
    backgroundColor: c.SURFACE,
  },
  keyPressed: {
    opacity: 0.6,
  },
  keyText: {
    fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
    fontSize: 20,
    color: c.TEXT_PRIMARY,
  },
  keyEquals: {
    backgroundColor: c.PRIMARY_LIGHT,
    borderColor: c.PRIMARY_LIGHT,
  },
  keyEqualsText: {
    color: c.PRIMARY_TEXT,
  },
});
