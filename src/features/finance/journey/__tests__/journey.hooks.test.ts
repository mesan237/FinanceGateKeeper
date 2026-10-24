import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/features/finance/journey/journey.service', () => ({
  getJourney: jest.fn(),
  markPictureReviewed: jest.fn().mockResolvedValue(undefined),
  skipToStep: jest.fn().mockResolvedValue(undefined),
}));

import { useJourney } from '@/features/finance/journey/journey.hooks';
import * as service from '@/features/finance/journey/journey.service';
import type { Journey } from '@/features/finance/journey/journey.types';

const mocked = service as jest.Mocked<typeof service>;

const JOURNEY: Journey = {
  current: 'observe',
  steps: [],
  observe: { recorded: 1, needed: 3 },
  start: null,
  latest: null,
  plannedMonth: null,
  beatStartMonth: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getJourney.mockResolvedValue(JOURNEY);
});

describe('useJourney (VS-63)', () => {
  it('loads the journey', async () => {
    const { result } = renderHook(() => useJourney());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.journey).toEqual(JOURNEY);
  });

  it('reports a load failure as an error', async () => {
    mocked.getJourney.mockRejectedValueOnce(new Error('disk'));

    const { result } = renderHook(() => useJourney());

    await waitFor(() => expect(result.current.error).toBe('disk'));
  });

  it('records "I have seen it" and re-reads', async () => {
    const { result } = renderHook(() => useJourney());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.reviewPicture());

    expect(mocked.markPictureReviewed).toHaveBeenCalled();
    expect(mocked.getJourney).toHaveBeenCalledTimes(2);
  });

  it('skips ahead and re-reads', async () => {
    const { result } = renderHook(() => useJourney());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.skipTo('plan'));

    expect(mocked.skipToStep).toHaveBeenCalledWith('plan');
    expect(mocked.getJourney).toHaveBeenCalledTimes(2);
  });
});
