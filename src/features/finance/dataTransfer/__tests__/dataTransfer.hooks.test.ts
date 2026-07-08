import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/dataTransfer.service', () => ({
  exportData: jest.fn(),
  importData: jest.fn(),
}));

import { getDocumentAsync } from 'expo-document-picker';
import { shareAsync } from 'expo-sharing';

import { exportData, importData } from '@/services/dataTransfer.service';
import type { ExportPayload } from '@/services/dataTransfer.types';

import { useExportData, useImportData } from '../dataTransfer.hooks';

const mockExportData = exportData as jest.Mock;
const mockImportData = importData as jest.Mock;
const mockGetDocumentAsync = getDocumentAsync as jest.Mock;
const mockShareAsync = shareAsync as jest.Mock;

const PAYLOAD: ExportPayload = {
  version: 1,
  exportedAt: '2026-07-08T12:00:00.000Z',
  tables: { categories: [{ id: 1 }], expenses: [{ id: 1 }, { id: 2 }] },
};

afterEach(() => jest.clearAllMocks());

describe('useExportData', () => {
  it('writes the export payload to a file and opens the share sheet', async () => {
    mockExportData.mockResolvedValue(PAYLOAD);
    const { result } = renderHook(() => useExportData());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.run();
    });

    expect(ok).toBe(true);
    expect(mockExportData).toHaveBeenCalledTimes(1);
    expect(mockShareAsync).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('surfaces a failure without throwing', async () => {
    mockExportData.mockRejectedValue(new Error('disk full'));
    const { result } = renderHook(() => useExportData());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.run();
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('disk full');
  });
});

describe('useImportData', () => {
  it('pick() returns null when the user cancels', async () => {
    mockGetDocumentAsync.mockResolvedValue({ canceled: true, assets: null });
    const { result } = renderHook(() => useImportData());

    let picked;
    await act(async () => {
      picked = await result.current.pick();
    });

    expect(picked).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('pick() returns the parsed payload and a row-count preview', async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'mock-picked-file.json', name: 'backup.json' }],
    });
    const { result } = renderHook(() => useImportData());

    // Seed the mocked expo-file-system's in-memory store via a real File write,
    // mirroring what the document picker would have produced on disk.
    const { File } = jest.requireMock('expo-file-system');
    const seeded = new File('mock-picked-file.json');
    seeded.create({ overwrite: true });
    seeded.write(JSON.stringify(PAYLOAD));

    let picked;
    await act(async () => {
      picked = await result.current.pick();
    });

    expect(picked).toEqual({
      payload: PAYLOAD,
      summary: { categories: 1, expenses: 2 },
    });
  });

  it('confirm() calls importData and returns the summary', async () => {
    mockImportData.mockResolvedValue({ categories: 1, expenses: 2 });
    const { result } = renderHook(() => useImportData());

    let summary;
    await act(async () => {
      summary = await result.current.confirm(PAYLOAD);
    });

    expect(mockImportData).toHaveBeenCalledWith(PAYLOAD);
    expect(summary).toEqual({ categories: 1, expenses: 2 });
    expect(result.current.error).toBeNull();
  });

  it('confirm() surfaces a failure without throwing', async () => {
    mockImportData.mockRejectedValue(new Error('bad payload'));
    const { result } = renderHook(() => useImportData());

    let summary;
    await act(async () => {
      summary = await result.current.confirm(PAYLOAD);
    });

    expect(summary).toBeNull();
    expect(result.current.error).toBe('bad payload');
  });
});
