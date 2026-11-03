import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * How far the on-screen keyboard reaches up from the bottom of the screen, in
 * dp, or 0 while it is hidden.
 *
 * iOS announces the keyboard before it animates (`Will*`), so the layout can
 * move with it; Android only reports once it is fully shown (`Did*`).
 *
 * On Android, React Native reports the keyboard minus the system bars
 * (`ime − systemBars`). The app draws edge-to-edge, so the keyboard also covers
 * the navigation bar, and the bar's height is added back. Without it, the
 * bottom strip of every sheet stayed under the keyboard, where a focused note
 * field ends up.
 */
export function useKeyboardHeight(): number {
  const [reported, setReported] = useState(0);
  const { bottom: navigationBar } = useSafeAreaInsets();

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (event) =>
      setReported(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setReported(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (reported === 0) return 0;
  return Platform.OS === 'android' ? reported + navigationBar : reported;
}
