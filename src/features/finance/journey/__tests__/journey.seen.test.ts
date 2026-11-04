import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/uiPreferences', () => ({
  getPreference: jest.fn(),
  setPreference: jest.fn().mockResolvedValue(undefined),
}));

import { SEEN_STEP_KEY, useNewStep } from '@/features/finance/journey/journey.seen';
import * as prefs from '@/services/uiPreferences';
import type { JourneyStepKey } from '@/types/journey';

const mocked = prefs as jest.Mocked<typeof prefs>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPreference.mockResolvedValue(null);
  mocked.setPreference.mockResolvedValue(undefined);
});

describe('useNewStep (VS-94)', () => {
  it('flags a step reached since the user last opened the path', async () => {
    mocked.getPreference.mockResolvedValue('observe');
    const { result } = renderHook(() => useNewStep('see'));

    await waitFor(() => expect(result.current.isNew).toBe(true));
    expect(mocked.getPreference).toHaveBeenCalledWith(SEEN_STEP_KEY);
  });

  it('does not flag the step the user has already seen', async () => {
    mocked.getPreference.mockResolvedValue('see');
    const { result } = renderHook(() => useNewStep('see'));

    await waitFor(() => expect(mocked.getPreference).toHaveBeenCalled());
    expect(result.current.isNew).toBe(false);
  });

  it('records the first step it meets without flagging it, so nobody is told an old step is new', async () => {
    const { result } = renderHook(() => useNewStep('plan'));

    await waitFor(() => expect(mocked.setPreference).toHaveBeenCalledWith(SEEN_STEP_KEY, 'plan'));
    expect(result.current.isNew).toBe(false);
  });

  it('clears the flag and remembers the step once seen', async () => {
    mocked.getPreference.mockResolvedValue('observe');
    const { result } = renderHook(() => useNewStep('see'));
    await waitFor(() => expect(result.current.isNew).toBe(true));

    act(() => result.current.markSeen());

    expect(result.current.isNew).toBe(false);
    expect(mocked.setPreference).toHaveBeenCalledWith(SEEN_STEP_KEY, 'see');
  });

  it('waits for the journey before reading anything', () => {
    const { result } = renderHook(() => useNewStep(null as JourneyStepKey | null));

    expect(result.current.isNew).toBe(false);
    expect(mocked.getPreference).not.toHaveBeenCalled();
  });

  it('stays quiet when the preference cannot be read', async () => {
    mocked.getPreference.mockRejectedValue(new Error('disk'));
    const { result } = renderHook(() => useNewStep('see'));

    await waitFor(() => expect(mocked.getPreference).toHaveBeenCalled());
    expect(result.current.isNew).toBe(false);
  });
});
