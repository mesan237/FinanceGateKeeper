import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
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
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastViewport } from '@/components/Toast';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

/** Open (slide-up/fade-in) and close (slide-down/fade-out) animation lengths. */
const OPEN_MS = 240;
const CLOSE_MS = 200;

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
 * and the panel springs up from the bottom; tapping the backdrop closes it and
 * the panel keeps clear of the keyboard.
 *
 * The native `Modal` cannot animate its own dismissal, so the panel/backdrop
 * are animated with an explicit reanimated shared value (`progress`, 0 closed →
 * 1 open) rather than mount/unmount `entering`/`exiting` layout presets. Layout
 * presets inside a native `Modal` are unreliable on Android — the entering
 * animation races the Modal's freshly-created window and sometimes never fires,
 * leaving the panel stuck off-screen until you close and reopen. Driving a
 * shared value keeps a single persistent view on screen, so opening always
 * plays and reopening mid-close simply reverses the same animation. The Modal
 * is torn down from the close animation's own completion callback (not a timer),
 * so it unmounts exactly when the slide-out finishes.
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
  const progress = useSharedValue(visible ? 1 : 0);
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

  const handleClosed = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
      return;
    }
    // Reversing an in-flight open cancels its callback (finished === false), so
    // the Modal only tears down once a full close actually settles.
    progress.value = withTiming(
      0,
      { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        'worklet';
        if (finished) runOnJS(handleClosed)();
      },
    );
  }, [visible, progress, handleClosed]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => ({
    // Anchored at the bottom edge; translating by the full window height keeps
    // it entirely off-screen at progress 0 regardless of the panel's own height.
    transform: [{ translateY: (1 - progress.value) * windowHeight }],
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.fill} testID={testID}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            testID={testID ? `${testID}-backdrop` : 'bottom-sheet-backdrop'}
            style={styles.backdropPress}
            onPress={onClose}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoider}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.sheet, { maxHeight: windowHeight * 0.92 }, panelStyle]}>
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
