import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';

import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { hapticSuccess } from '@/utils/haptics';

const TOAST_MS = 2000;

interface ToastApi {
  /** Flashes a transient confirmation toast and fires a success haptic. */
  show: (message: string) => void;
}

// Two contexts so `useToast` consumers don't re-render on every message change;
// only viewports subscribe to the message itself.
const ToastApiContext = createContext<ToastApi>({ show: () => undefined });
const ToastMessageContext = createContext<string | null>(null);

/**
 * Returns the app-wide toast API. Outside a `ToastProvider` (e.g. a component
 * rendered bare in a test) `show` is a safe no-op, so screens never need the
 * provider just to render.
 */
export function useToast(): ToastApi {
  return useContext(ToastApiContext);
}

/**
 * Renders the currently active toast message, if any. The provider mounts one
 * over the navigator; `BottomSheet` mounts another inside its native Modal,
 * because a Modal draws above the whole window and would otherwise hide a
 * toast fired while a sheet stays open (e.g. one-tap template logging).
 */
export function ToastViewport() {
  const message = useContext(ToastMessageContext);
  const styles = useThemedStyles(makeStyles);
  if (!message) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(180)}
      exiting={FadeOut.duration(150)}
      pointerEvents="none"
      testID="app-toast"
      style={styles.toast}
    >
      <Typography style={styles.text}>{message}</Typography>
    </Animated.View>
  );
}

/**
 * App-wide success-toast state. Mount once in the root layout; fire from any
 * screen via `useToast().show(...)`. A new message replaces the current one
 * and restarts the 2s auto-dismiss clock.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear a pending dismiss timer on unmount so it can't fire after teardown.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const show = useCallback((msg: string) => {
    hapticSuccess();
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastApiContext.Provider value={api}>
      <ToastMessageContext.Provider value={message}>
        {children}
        <ToastViewport />
      </ToastMessageContext.Provider>
    </ToastApiContext.Provider>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: c.SUCCESS,
    borderRadius: RADIUS.sm,
    padding: 12,
    alignItems: 'center',
  },
  text: {
    color: c.TEXT_INVERSE,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
