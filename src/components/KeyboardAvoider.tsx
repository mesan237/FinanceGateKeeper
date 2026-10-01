import React from 'react';
import { KeyboardAvoidingView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export interface KeyboardAvoiderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Keeps its content above the on-screen keyboard.
 *
 * `behavior="padding"` is set on **both** platforms on purpose. From Expo 54 the
 * app draws edge-to-edge on Android, where the window no longer shrinks for the
 * keyboard, so leaving Android's behaviour undefined let the keyboard cover
 * inputs. The padding is the measured overlap between this view and the
 * keyboard, so it is zero whenever the system has already made room — it can
 * never double up.
 */
export function KeyboardAvoider({ children, style }: KeyboardAvoiderProps) {
  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.flex, style]}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
