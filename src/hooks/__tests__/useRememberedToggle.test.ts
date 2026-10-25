import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/uiPreferences', () => ({
  getPreference: jest.fn(),
  setPreference: jest.fn().mockResolvedValue(undefined),
}));

import { useRememberedToggle } from '@/hooks/useRememberedToggle';
import * as prefs from '@/services/uiPreferences';

const mocked = prefs as jest.Mocked<typeof prefs>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPreference.mockResolvedValue(null);
  mocked.setPreference.mockResolvedValue(undefined);
});

describe('useRememberedToggle (UX-14)', () => {
  it('follows the default while the user has not chosen', async () => {
    const { result, rerender } = renderHook(({ fallback }: { fallback: boolean }) => useRememberedToggle('k', fallback), {
      initialProps: { fallback: false },
    });
    await waitFor(() => expect(mocked.getPreference).toHaveBeenCalledWith('k'));
    expect(result.current.open).toBe(false);

    // A later step changes the default, and the group follows it.
    rerender({ fallback: true });
    expect(result.current.open).toBe(true);
  });

  it('uses the remembered choice over the default', async () => {
    mocked.getPreference.mockResolvedValue('open');
    const { result } = renderHook(() => useRememberedToggle('k', false));

    await waitFor(() => expect(result.current.open).toBe(true));
  });

  it('flips and remembers the choice', async () => {
    const { result } = renderHook(() => useRememberedToggle('k', false));
    await waitFor(() => expect(mocked.getPreference).toHaveBeenCalled());

    act(() => result.current.toggle());

    expect(result.current.open).toBe(true);
    expect(mocked.setPreference).toHaveBeenCalledWith('k', 'open');
  });

  it('keeps the choice on screen when it cannot be saved', async () => {
    mocked.setPreference.mockRejectedValue(new Error('disk'));
    const { result } = renderHook(() => useRememberedToggle('k', true));
    await waitFor(() => expect(mocked.getPreference).toHaveBeenCalled());

    act(() => result.current.toggle());

    await waitFor(() => expect(mocked.setPreference).toHaveBeenCalled());
    expect(result.current.open).toBe(false);
  });
});
