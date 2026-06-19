import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { ToastViewport } from '@/components/Toast';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

/** How long the slide-down/fade-out exit plays before the Modal unmounts. */
const EXIT_DURATION_MS = 200;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  testID?: string;
}

/**
 * A bottom-anchored sheet built on the native `Modal`. The backdrop fades in
 * and the panel springs up from the bottom (via reanimated entering presets),
 * giving a premium slide-up without a gesture/library dependency. Tapping the
 * backdrop closes it; the panel keeps clear of the keyboard.
 *
 * The native `Modal` cannot animate its own dismissal, so closing happens in
 * two steps: when `visible` goes false the inner views unmount and play their
 * `exiting` presets inside the still-open Modal; once they have finished,
 * `mounted` goes false and tears the Modal down.
 *
 * The body scrolls inside a height cap tied to the live window height. On
 * Android the window resizes when the keyboard opens, shrinking the cap so a
 * tall form (e.g. the amount field at the top) stays reachable above the
 * keyboard instead of being pushed off-screen.
 */
export function BottomSheet({ visible, onClose, children, testID }: BottomSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    // Small buffer past the exit duration so the last frames aren't clipped.
    const timer = setTimeout(() => setMounted(false), EXIT_DURATION_MS + 50);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible && !mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.fill} testID={testID}>
        {visible ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(EXIT_DURATION_MS)}
            style={styles.backdrop}
          >
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              testID={testID ? `${testID}-backdrop` : 'bottom-sheet-backdrop'}
              style={styles.backdropPress}
              onPress={onClose}
            />
          </Animated.View>
        ) : null}

        {visible ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.avoider}
            pointerEvents="box-none"
          >
            <Animated.View
              entering={SlideInDown.duration(240)}
              exiting={SlideOutDown.duration(EXIT_DURATION_MS)}
              style={[styles.sheet, { maxHeight: windowHeight * 0.9 }]}
            >
              <View style={styles.handle} />
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {children}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        ) : null}

        {/* The native Modal draws above the root toast viewport, so sheets
            mount their own — a toast fired while the sheet stays open (e.g.
            one-tap template logging) would otherwise be invisible. */}
        <ToastViewport />
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropPress: {
    flex: 1,
  },
  avoider: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.SURFACE,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: c.BORDER_STRONG,
    marginBottom: 12,
  },
});
