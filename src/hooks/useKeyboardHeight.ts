import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * The height of the on-screen keyboard in dp, or 0 while it is hidden.
 *
 * iOS announces the keyboard before it animates (`Will*`), so the layout can
 * move with it; Android only reports once it is fully shown (`Did*`).
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (event) =>
      setHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
