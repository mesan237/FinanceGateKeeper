import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

jest.mock('@/services/snapshots.service', () => ({ ensureDailySnapshot: jest.fn() }));

import { useDailySnapshot } from '@/hooks/useDailySnapshot';
import * as snapshots from '@/services/snapshots.service';

const mEnsure = snapshots.ensureDailySnapshot as jest.Mock;

let changeHandler: ((state: string) => void) | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  mEnsure.mockResolvedValue(null);
  changeHandler = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    changeHandler = handler as (state: string) => void;
    return { remove: jest.fn() } as never;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('takes the daily snapshot on mount', async () => {
  renderHook(() => useDailySnapshot());
  await waitFor(() => expect(mEnsure).toHaveBeenCalledTimes(1));
});

it('checks again when the app returns to the foreground', async () => {
  renderHook(() => useDailySnapshot());
  await waitFor(() => expect(mEnsure).toHaveBeenCalledTimes(1));

  await act(async () => {
    changeHandler?.('active');
  });
  await waitFor(() => expect(mEnsure).toHaveBeenCalledTimes(2));
});

it('ignores the app going to the background', async () => {
  renderHook(() => useDailySnapshot());
  await waitFor(() => expect(mEnsure).toHaveBeenCalledTimes(1));

  await act(async () => {
    changeHandler?.('background');
  });
  expect(mEnsure).toHaveBeenCalledTimes(1);
});

it('never throws when the snapshot fails', async () => {
  mEnsure.mockRejectedValue(new Error('disk full'));
  const unhandled = jest.fn();
  process.on('unhandledRejection', unhandled);

  renderHook(() => useDailySnapshot());
  await waitFor(() => expect(mEnsure).toHaveBeenCalledTimes(1));
  await act(async () => {
    await Promise.resolve();
  });

  process.off('unhandledRejection', unhandled);
  expect(unhandled).not.toHaveBeenCalled();
});

it('skips a foreground check while the previous one is still running', async () => {
  let finish: (() => void) | undefined;
  mEnsure.mockImplementation(
    () =>
      new Promise<null>((resolve) => {
        finish = () => resolve(null);
      }),
  );
  renderHook(() => useDailySnapshot());
  await waitFor(() => expect(mEnsure).toHaveBeenCalledTimes(1));

  await act(async () => {
    changeHandler?.('active');
  });
  expect(mEnsure).toHaveBeenCalledTimes(1);

  await act(async () => {
    finish?.();
  });
  await act(async () => {
    changeHandler?.('active');
  });
  expect(mEnsure).toHaveBeenCalledTimes(2);
});
