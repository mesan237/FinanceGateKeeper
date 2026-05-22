import React from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { BACKGROUND, TEXT_MUTED, TEXT_PRIMARY } from '@/constants/colors';

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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
