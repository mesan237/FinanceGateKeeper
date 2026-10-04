import { act, render, renderHook, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import {
  AttentionProvider,
  useAnyAttention,
  useAttention,
  useSetAttention,
} from '@/components/AttentionProvider';

function wrapper({ children }: { children: React.ReactNode }) {
  return <AttentionProvider>{children}</AttentionProvider>;
}

describe('AttentionProvider', () => {
  it('reports nothing for a section that has not published', () => {
    const { result } = renderHook(() => useAttention('planned'), { wrapper });
    expect(result.current).toEqual({ soon: 0, overdue: 0 });
  });

  it('shares what a section publishes with every reader', () => {
    const { result } = renderHook(
      () => ({ set: useSetAttention(), planned: useAttention('planned'), any: useAnyAttention() }),
      { wrapper },
    );

    act(() => result.current.set('planned', { soon: 2, overdue: 1 }));

    expect(result.current.planned).toEqual({ soon: 2, overdue: 1 });
    expect(result.current.any).toEqual({ soon: 2, overdue: 1 });
  });

  it('adds up every section for the menu button', () => {
    const { result } = renderHook(() => ({ set: useSetAttention(), any: useAnyAttention() }), {
      wrapper,
    });

    act(() => {
      result.current.set('planned', { soon: 1, overdue: 0 });
      result.current.set('debts', { soon: 0, overdue: 2 });
    });

    expect(result.current.any).toEqual({ soon: 1, overdue: 2 });
  });

  it('reads as nothing outside a provider, so screens render in isolation', () => {
    function Reader() {
      const { soon } = useAttention('planned');
      return <Text>{`soon ${soon}`}</Text>;
    }
    render(<Reader />);
    expect(screen.getByText('soon 0')).toBeTruthy();
  });
});
