import { fireEvent, render, screen } from '@testing-library/react-native';
import React, { useEffect } from 'react';

const mockDispatch = jest.fn();
jest.mock('expo-router', () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
}));

import {
  AttentionProvider,
  useSetAttention,
  type AttentionCounts,
} from '@/components/AttentionProvider';
import { MenuButton } from '@/components/MenuButton';

function Publish({ counts }: { counts: AttentionCounts }) {
  const set = useSetAttention();
  useEffect(() => set('planned', counts), [set, counts]);
  return null;
}

function renderButton(counts: AttentionCounts) {
  render(
    <AttentionProvider>
      <Publish counts={counts} />
      <MenuButton />
    </AttentionProvider>,
  );
}

describe('MenuButton', () => {
  it('opens the drawer', () => {
    renderButton({ soon: 0, overdue: 0 });
    fireEvent.press(screen.getByRole('button', { name: 'Open menu' }));
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'OPEN_DRAWER' }));
  });

  it('carries a dot while anything in the drawer needs attention', () => {
    renderButton({ soon: 1, overdue: 0 });
    expect(screen.getByTestId('menu-attention-dot')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open menu' }).props.accessibilityHint).toBe(
      '1 due soon',
    );
  });

  it('has no dot when nothing does', () => {
    renderButton({ soon: 0, overdue: 0 });
    expect(screen.queryByTestId('menu-attention-dot')).toBeNull();
  });
});
