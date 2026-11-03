import { act, renderHook } from '@testing-library/react-native';
import { Keyboard, Platform } from 'react-native';

import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

/** A phone with three-button navigation: a 48 dp navigation bar. */
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 48, left: 0 }),
}));

type Handler = (event: { endCoordinates: { height: number } }) => void;

let handlers: Record<string, Handler>;
let removed: jest.Mock;

beforeEach(() => {
  handlers = {};
  removed = jest.fn();
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, cb: Handler) => {
    handlers[name] = cb;
    return { remove: removed };
  }) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useKeyboardHeight', () => {
  it('is 0 while the keyboard is hidden', () => {
    const { result } = renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(0);
  });

  it('stops listening when the component unmounts', () => {
    const { unmount } = renderHook(() => useKeyboardHeight());
    unmount();
    expect(removed).toHaveBeenCalledTimes(2);
  });

  // React Native reports the keyboard minus the system bars (ime − systemBars),
  // but the app draws edge-to-edge, so the keyboard covers the navigation bar
  // too. Leaving it out left the bottom of every sheet under the keyboard.
  it('on Android, counts the navigation bar the keyboard covers', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => handlers.keyboardDidShow({ endCoordinates: { height: 300 } }));
    expect(result.current).toBe(348);

    act(() => handlers.keyboardDidHide({ endCoordinates: { height: 0 } }));
    expect(result.current).toBe(0);
  });

  it('on iOS, takes the reported height as it is', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => handlers.keyboardWillShow({ endCoordinates: { height: 336 } }));
    expect(result.current).toBe(336);

    act(() => handlers.keyboardWillHide({ endCoordinates: { height: 0 } }));
    expect(result.current).toBe(0);
  });
});
