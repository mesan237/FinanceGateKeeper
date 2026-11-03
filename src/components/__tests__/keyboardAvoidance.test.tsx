import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { KeyboardAvoider, keyboardPadding } from '@/components/KeyboardAvoider';
import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { Modal } from '@/components/Modal';

const mockKeyboardHeight = jest.fn(() => 0);
jest.mock('@/hooks/useKeyboardHeight', () => ({
  useKeyboardHeight: () => mockKeyboardHeight(),
}));

/** The one `measureInWindow` React Native's Jest mock gives every View. */
const nativeMethods = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
  'react-native/jest/MockNativeMethods',
).default;

/** An 800 dp screen; the measured view starts under a 24 dp status bar and a 56 dp header. */
const SCREEN = { width: 360, height: 800, scale: 2, fontScale: 1 };

function placeViewAt(y: number, height: number) {
  nativeMethods.measureInWindow.mockImplementation((cb: (x: number, y: number, w: number, h: number) => void) =>
    cb(0, y, 360, height),
  );
}

function paddingOf(testID: string): number {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style).paddingBottom as number | undefined) ?? 0;
}

const PLATFORMS = ['android', 'ios'] as const;

beforeEach(() => {
  mockKeyboardHeight.mockReturnValue(0);
  jest.spyOn(Dimensions, 'get').mockReturnValue(SCREEN);
  nativeMethods.measureInWindow.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('keyboardPadding', () => {
  it('is the part of the view the keyboard covers', () => {
    // View ends at 752 (above a 48 dp nav bar); the keyboard top is 800 − 348 = 452.
    expect(keyboardPadding(752, 348, 800)).toBe(300);
  });

  it('is 0 when the keyboard is closed, the view is not measured yet, or the view ends above it', () => {
    expect(keyboardPadding(752, 0, 800)).toBe(0);
    expect(keyboardPadding(null, 348, 800)).toBe(0);
    expect(keyboardPadding(400, 348, 800)).toBe(0);
  });
});

describe.each(PLATFORMS)('keyboard avoidance on %s', (os) => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', os);
  });

  // KeyboardAvoidingView compared its frame inside its parent with the keyboard's
  // place on screen, so the status bar and header above a pushed form went
  // uncounted and the lower fields stayed under the keyboard.
  it('KeyboardAvoider pads by what the keyboard covers, measured on screen', () => {
    placeViewAt(80, 672);
    mockKeyboardHeight.mockReturnValue(348);
    render(
      <KeyboardAvoider testID="avoider">
        <Text>field</Text>
      </KeyboardAvoider>,
    );
    expect(paddingOf('avoider')).toBe(300);
    expect(screen.UNSAFE_queryByType(KeyboardAvoidingView)).toBeNull();
  });

  it('KeyboardAvoider adds nothing while the keyboard is closed', () => {
    placeViewAt(80, 672);
    render(
      <KeyboardAvoider testID="avoider">
        <Text>field</Text>
      </KeyboardAvoider>,
    );
    expect(paddingOf('avoider')).toBe(0);
  });

  it('KeyboardAwareForm pads its scroll area above the keyboard', () => {
    placeViewAt(80, 672);
    mockKeyboardHeight.mockReturnValue(348);
    render(
      <KeyboardAwareForm>
        <Text>field</Text>
      </KeyboardAwareForm>,
    );
    expect(paddingOf('keyboard-aware-form')).toBe(300);
    expect(screen.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('BottomSheet lifts its panel by the keyboard height', () => {
    mockKeyboardHeight.mockReturnValue(300);
    render(
      <BottomSheet visible onClose={jest.fn()} testID="sheet">
        <Text>field</Text>
      </BottomSheet>,
    );
    const lift = StyleSheet.flatten(screen.getByTestId('sheet-lift').props.style);
    expect(lift.paddingBottom).toBe(300);
  });

  it('BottomSheet sits flush with the bottom edge once the keyboard is closed', () => {
    render(
      <BottomSheet visible onClose={jest.fn()} testID="sheet">
        <Text>field</Text>
      </BottomSheet>,
    );
    const lift = StyleSheet.flatten(screen.getByTestId('sheet-lift').props.style);
    expect(lift.paddingBottom ?? 0).toBe(0);
    expect(screen.UNSAFE_queryByType(KeyboardAvoidingView)).toBeNull();
  });

  it('Modal keeps a centred dialog clear of the keyboard and lets it scroll', () => {
    placeViewAt(0, 800);
    mockKeyboardHeight.mockReturnValue(348);
    render(
      <Modal visible>
        <Text>field</Text>
      </Modal>,
    );
    expect(paddingOf('dialog-keyboard-avoider')).toBe(348);
    expect(screen.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
  });
});

describe('KeyboardAwareForm', () => {
  it('applies extra content styling to the scrolled fields', () => {
    render(
      <KeyboardAwareForm contentContainerStyle={{ gap: 12 }}>
        <Text>field</Text>
      </KeyboardAwareForm>,
    );
    const style = StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle);
    expect(style.gap).toBe(12);
  });
});

describe('BottomSheet height while the keyboard is open', () => {
  function panelMaxHeight(): number {
    const panel = screen.getByTestId('sheet-panel');
    return StyleSheet.flatten(panel.props.style).maxHeight as number;
  }

  it('keeps the usual cap when the keyboard is closed', () => {
    render(
      <BottomSheet visible onClose={jest.fn()} testID="sheet">
        <Text>field</Text>
      </BottomSheet>,
    );
    const closed = panelMaxHeight();
    expect(closed).toBeGreaterThan(0);
  });

  it('shrinks the cap by the keyboard height so a tall form scrolls instead of being clipped', () => {
    const { unmount } = render(
      <BottomSheet visible onClose={jest.fn()} testID="sheet">
        <Text>field</Text>
      </BottomSheet>,
    );
    const closed = panelMaxHeight();
    unmount();

    mockKeyboardHeight.mockReturnValue(300);
    render(
      <BottomSheet visible onClose={jest.fn()} testID="sheet">
        <Text>field</Text>
      </BottomSheet>,
    );

    expect(panelMaxHeight()).toBeLessThan(closed);
  });
});
