import { act, renderHook } from '@testing-library/react-native';
import React from 'react';

import {
  JourneyStageProvider,
  useIsBeforeStep,
  useJourneyFigures,
  useJourneyStage,
  useSetJourneyFigures,
  useSetJourneyStage,
} from '@/components/JourneyStageProvider';
import type { JourneyFigures } from '@/types/journey';

const FIGURES: JourneyFigures = {
  typicalMonth: 150_000,
  variableStart: 60_000,
  variableLatest: { month: '2026-09', amount: 52_000 },
  logging: { month: '2026-10', loggedDays: 18, daysSoFar: 23 },
};

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

  it('shares the journey figures the step leads with (UX-24)', () => {
    const { result } = renderHook(() => ({ set: useSetJourneyFigures(), figures: useJourneyFigures() }), {
      wrapper,
    });
    expect(result.current.figures).toBeNull();

    act(() => result.current.set(FIGURES));

    expect(result.current.figures).toEqual(FIGURES);
  });

  it('works outside a provider: no step, and publishing is a no-op', () => {
    const { result } = renderHook(() => ({ set: useSetJourneyStage(), stage: useJourneyStage() }));

    act(() => result.current.set('grow'));

    expect(result.current.stage).toBeNull();
  });
});
