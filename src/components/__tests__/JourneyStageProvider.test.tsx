import { act, renderHook } from '@testing-library/react-native';
import React from 'react';

import {
  JourneyStageProvider,
  useIsBeforeStep,
  useJourneyStage,
  useSetJourneyStage,
} from '@/components/JourneyStageProvider';

function wrapper({ children }: { children: React.ReactNode }) {
  return <JourneyStageProvider>{children}</JourneyStageProvider>;
}

describe('JourneyStageProvider (UX-03)', () => {
  it('knows no step until the journey publishes one', () => {
    const { result } = renderHook(() => useJourneyStage(), { wrapper });
    expect(result.current).toBeNull();
  });

  it('shares the published step with every reader', () => {
    const { result } = renderHook(() => ({ set: useSetJourneyStage(), stage: useJourneyStage() }), {
      wrapper,
    });

    act(() => result.current.set('see'));

    expect(result.current.stage).toBe('see');
  });

  it('says whether the user is still before a step', () => {
    const { result } = renderHook(
      () => ({ set: useSetJourneyStage(), beforePlan: useIsBeforeStep('plan'), beforeGrow: useIsBeforeStep('grow') }),
      { wrapper },
    );

    act(() => result.current.set('plan'));

    expect(result.current.beforePlan).toBe(false);
    expect(result.current.beforeGrow).toBe(true);
  });

  it('never gates while the step is unknown, so nothing flashes as a preview', () => {
    const { result } = renderHook(() => useIsBeforeStep('grow'), { wrapper });
    expect(result.current).toBe(false);
  });

  it('works outside a provider: no step, and publishing is a no-op', () => {
    const { result } = renderHook(() => ({ set: useSetJourneyStage(), stage: useJourneyStage() }));

    act(() => result.current.set('grow'));

    expect(result.current.stage).toBeNull();
  });
});
