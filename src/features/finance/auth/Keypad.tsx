import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';

export interface KeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const ROWS: ReadonlyArray<ReadonlyArray<string | null>> = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [null, '0', 'backspace'],
];

/**
 * 3x4 numeric keypad used by the auth screen. Emits each digit as a string and
 * a separate backspace event so the consumer owns the entry buffer.
 */
export function Keypad({ onDigit, onBackspace, disabled = false }: KeypadProps) {
  return (
    <View style={styles.grid} testID="keypad">
      {ROWS.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((cell, colIdx) => {
            if (cell === null) return <View key={colIdx} style={styles.cell} />;
            if (cell === 'backspace') {
              return (
                <View key={colIdx} style={styles.cell}>
                  <Button
                    label="⌫"
                    onPress={onBackspace}
                    disabled={disabled}
                    accessibilityLabel="Backspace"
                  />
                </View>
              );
            }
            return (
              <View key={colIdx} style={styles.cell}>
                <Button
                  label={cell}
                  onPress={() => onDigit(cell)}
                  disabled={disabled}
                  accessibilityLabel={`Digit ${cell}`}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    maxWidth: 320,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    padding: 6,
  },
});
