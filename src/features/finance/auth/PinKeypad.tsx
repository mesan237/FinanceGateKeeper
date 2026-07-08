import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export interface PinKeypadProps {
  /** The digits entered so far; drives the filled-dot count. */
  value: string;
  /** Called with the next value after a digit press or delete. */
  onChange: (next: string) => void;
  /** Blocks input (e.g. during a cooldown). */
  disabled?: boolean;
}

/**
 * A numeric PIN pad: a row of `PIN_LENGTH` progress dots above a 3×4 keypad
 * (1–9, a spacer, 0, and a delete key). Stateless — the parent owns the entered
 * value and decides what to do when it reaches full length.
 */
export function PinKeypad({ value, onChange, disabled = false }: PinKeypadProps) {
  const styles = useThemedStyles(makeStyles);

  const press = (key: string) => {
    if (disabled) return;
    if (key === 'del') {
      onChange(value.slice(0, -1));
    } else if (value.length < PIN_LENGTH) {
      onChange(value + key);
    }
  };

  return (
    <View>
      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View
            key={i}
            testID={`pin-dot-${i}`}
            style={[styles.dot, i < value.length && styles.dotFilled]}
          />
        ))}
      </View>

      <View style={styles.grid}>
        {KEYS.map((key, i) =>
          key === '' ? (
            <View key={`spacer-${i}`} style={styles.key} />
          ) : (
            <Pressable
              key={key}
              testID={key === 'del' ? 'pin-delete' : `pin-key-${key}`}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? 'Delete' : key}
              disabled={disabled}
              onPress={() => press(key)}
              style={({ pressed }) => [
                styles.key,
                key !== 'del' && styles.keyFilled,
                pressed && !disabled && styles.keyPressed,
                disabled && styles.keyDisabled,
              ]}
            >
              <Text style={styles.keyLabel}>{key === 'del' ? '⌫' : key}</Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 36,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: RADIUS.full,
      borderWidth: 2,
      borderColor: c.BORDER_STRONG,
    },
    dotFilled: {
      backgroundColor: c.PRIMARY_GREEN,
      borderColor: c.PRIMARY_GREEN,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 18,
      maxWidth: 300,
      alignSelf: 'center',
    },
    key: {
      width: 72,
      height: 72,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyFilled: {
      backgroundColor: c.SURFACE_MUTED,
    },
    keyPressed: {
      backgroundColor: c.PRIMARY_LIGHT,
    },
    keyDisabled: {
      opacity: 0.4,
    },
    keyLabel: {
      fontSize: 26,
      color: c.TEXT_PRIMARY,
      fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
    },
  });
