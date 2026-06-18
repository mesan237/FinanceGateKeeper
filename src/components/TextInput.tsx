import React from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { BACKGROUND, BORDER, TEXT_MUTED, TEXT_PRIMARY } from '@/constants/colors';
import { RADIUS } from '@/constants/layout';

export type TextInputProps = RNTextInputProps;

export function TextInput(props: TextInputProps) {
  return (
    <RNTextInput
      placeholderTextColor={TEXT_MUTED}
      style={[styles.base, props.style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: BACKGROUND,
    color: TEXT_PRIMARY,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
