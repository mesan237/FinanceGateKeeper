import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

export interface KeyboardAwareFormProps {
  children: React.ReactNode;
}

/**
 * Wraps a pushed-route form (amount, pickers, note, save button, ...) in the
 * same keyboard-avoidance `BottomSheet` already uses: iOS gets a `padding`
 * `KeyboardAvoidingView`, and both platforms scroll so a focused field near
 * the bottom of a tall form never sits behind the keyboard.
 */
export function KeyboardAwareForm({ children }: KeyboardAwareFormProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
});
