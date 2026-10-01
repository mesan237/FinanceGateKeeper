import { act, renderHook } from '@testing-library/react-native';
import { Keyboard, Platform } from 'react-native';

import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

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

  it('reports the keyboard height once it is shown, and 0 again when it hides', () => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => handlers[show]({ endCoordinates: { height: 310 } }));
    expect(result.current).toBe(310);

    act(() => handlers[hide]({ endCoordinates: { height: 0 } }));
    expect(result.current).toBe(0);
  });

  it('stops listening when the component unmounts', () => {
    const { unmount } = renderHook(() => useKeyboardHeight());
    unmount();
    expect(removed).toHaveBeenCalledTimes(2);
  });
});
