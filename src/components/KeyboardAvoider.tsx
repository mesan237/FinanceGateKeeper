import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

export interface KeyboardAvoiderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * How much of a view the keyboard covers, in dp: the view's bottom edge on
 * screen minus the keyboard's top edge, or 0 when the keyboard is closed, the
 * view is not measured yet, or it ends above the keyboard.
 *
 * @param viewBottom The view's bottom edge in screen coordinates, or null.
 * @param keyboardHeight How far the keyboard reaches up from the screen bottom.
 * @param screenHeight The full screen height (the app draws edge-to-edge).
 */
export function keyboardPadding(viewBottom: number | null, keyboardHeight: number, screenHeight: number): number {
  if (viewBottom === null || keyboardHeight <= 0) return 0;
  return Math.max(0, Math.round(viewBottom - (screenHeight - keyboardHeight)));
}

/**
 * Keeps its content above the on-screen keyboard, on both platforms.
 *
 * It measures its own bottom edge on screen and pads by exactly what the
 * keyboard covers. React Native's `KeyboardAvoidingView` is not used: it
 * compares its frame inside its parent with the keyboard's place on screen, so
 * on a pushed form the status bar and header above it went uncounted and the
 * lower fields (a note, the date, the wallet) stayed under the keyboard. The
 * app draws edge-to-edge, so screen and window coordinates are the same.
 *
 * Only the inside is padded; the view's own frame does not move, so a
 * scrolling child shrinks and Android scrolls the focused field back into view.
 */
export function KeyboardAvoider({ children, style, testID }: KeyboardAvoiderProps) {
  const ref = useRef<View>(null);
  const keyboardHeight = useKeyboardHeight();
  const [bottom, setBottom] = useState<number | null>(null);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((_x, y, _width, height) => setBottom(y + height));
  }, []);

  // The view may have moved since its last layout (a sheet sliding up), so
  // measure again whenever the keyboard opens or changes height.
  useEffect(() => {
    if (keyboardHeight > 0) measure();
  }, [keyboardHeight, measure]);

  const padding = keyboardPadding(bottom, keyboardHeight, Dimensions.get('screen').height);

  return (
    <View
      ref={ref}
      testID={testID}
      onLayout={measure}
      style={[styles.flex, style, padding > 0 && { paddingBottom: padding }]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
