import React from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { RADIUS } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export type TextInputProps = RNTextInputProps;

export function TextInput(props: TextInputProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  return (
    <RNTextInput
      placeholderTextColor={c.TEXT_MUTED}
      style={[styles.base, props.style]}
      {...props}
    />
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  base: {
    backgroundColor: c.BACKGROUND,
    color: c.TEXT_PRIMARY,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: c.BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
