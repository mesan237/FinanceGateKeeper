import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { KeyboardAvoider } from '@/components/KeyboardAvoider';
import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { Modal } from '@/components/Modal';

const mockKeyboardHeight = jest.fn(() => 0);
jest.mock('@/hooks/useKeyboardHeight', () => ({
  useKeyboardHeight: () => mockKeyboardHeight(),
}));

// Android is where the keyboard used to be ignored: from Expo 54 the app draws
// edge-to-edge and the window no longer resizes for it, so `behavior` must be
// set explicitly instead of left undefined.
const PLATFORMS = ['android', 'ios'] as const;

beforeEach(() => {
  mockKeyboardHeight.mockReturnValue(0);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe.each(PLATFORMS)('keyboard avoidance on %s', (os) => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', os);
  });

  it('KeyboardAvoider pads its content above the keyboard', () => {
    render(
      <KeyboardAvoider>
        <Text>field</Text>
      </KeyboardAvoider>,
    );
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('padding');
  });

  it('KeyboardAwareForm pads its scroll area above the keyboard', () => {
    render(
      <KeyboardAwareForm>
        <Text>field</Text>
      </KeyboardAwareForm>,
    );
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('padding');
    expect(screen.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('BottomSheet lifts its panel above the keyboard', () => {
    render(
      <BottomSheet visible onClose={jest.fn()} testID="sheet">
        <Text>field</Text>
      </BottomSheet>,
    );
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('padding');
  });

  it('Modal keeps a centred dialog clear of the keyboard and lets it scroll', () => {
    render(
      <Modal visible>
        <Text>field</Text>
      </Modal>,
    );
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('padding');
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
