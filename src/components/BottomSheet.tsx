import React, { createContext, useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastViewport } from '@/components/Toast';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

/** How long the slide-down/fade-out exit plays before the Modal unmounts. */
const EXIT_DURATION_MS = 200;

export interface SheetHost {
  /** Registers (or replaces) the overlay content rendered under `id`. */
  register: (id: string, node: React.ReactNode) => void;
  /** Removes the overlay content registered under `id`, if any. */
  unregister: (id: string) => void;
}

/**
 * Non-null only when read from inside a `BottomSheet`. `components/Modal.tsx`
 * uses this to render into the sheet's own top-level layer instead of opening
 * a second native `Modal` — nesting native `Modal`s stacks their backdrops and
 * is flaky on Android (see `Modal.tsx` for the full rationale).
 */
export const SheetHostContext = createContext<SheetHost | null>(null);

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
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const styles = useThemedStyles(makeStyles);

  // Overlay content registered by any `Modal` hosted within this sheet (see
  // `SheetHostContext`), keyed by a per-instance id. Rendered at this
  // component's own top level so it paints above the sheet's backdrop/panel
  // without a second native `Modal` window.
  const [overlays, setOverlays] = useState<Record<string, React.ReactNode>>({});
  const host = useMemo<SheetHost>(
    () => ({
      register: (id, node) => setOverlays((prev) => ({ ...prev, [id]: node })),
      unregister: (id) =>
        setOverlays((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        }),
    }),
    [],
  );

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
              style={[styles.sheet, { maxHeight: windowHeight * 0.92 }]}
            >
              <View style={styles.handle} />
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.scrollContent,
                  // Clear the Android nav bar / home indicator so the last
                  // button never sits under the system buttons.
                  { paddingBottom: 16 + insets.bottom },
                ]}
              >
                <SheetHostContext.Provider value={host}>{children}</SheetHostContext.Provider>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        ) : null}

        {/* The native Modal draws above the root toast viewport, so sheets
            mount their own — a toast fired while the sheet stays open (e.g.
            one-tap template logging) would otherwise be invisible. */}
        <ToastViewport />

        {/* Picker/alert content hosted via `SheetHostContext`, painted last so
            it sits above the backdrop, panel, and toast. */}
        {Object.entries(overlays).map(([id, node]) => (
          <React.Fragment key={id}>{node}</React.Fragment>
        ))}
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
    paddingBottom: 16,
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
