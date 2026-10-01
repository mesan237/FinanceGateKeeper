import React from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { KeyboardAvoider } from '@/components/KeyboardAvoider';

export interface KeyboardAwareFormProps {
  children: React.ReactNode;
  /** Extra styling for the scrolled content, e.g. a `gap` between fields. */
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Wraps a pushed-route form (amount, pickers, note, save button, ...) so a
 * focused field near the bottom never sits behind the keyboard: the form is
 * padded above the keyboard (`KeyboardAvoider`, both platforms) and scrolls, so
 * every field stays reachable.
 */
export function KeyboardAwareForm({ children, contentContainerStyle }: KeyboardAwareFormProps) {
  return (
    <KeyboardAvoider>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
});
