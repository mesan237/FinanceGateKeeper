import { useCallback, useState } from 'react';

import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

import { exportData, importData } from '@/services/dataTransfer.service';
import type { ExportPayload, ImportSummary } from '@/services/dataTransfer.types';

import type { PickedImport } from './dataTransfer.types';

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

/**
 * Writes a full local snapshot to a cache-dir JSON file and opens the OS share
 * sheet on it. Wraps `services/dataTransfer.service.exportData` so the screen
 * never touches `expo-file-system`/`expo-sharing` directly.
 */
export function useExportData() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      const payload = await exportData();
      const filename = `financegatekeeper-backup-${payload.exportedAt.replace(/[:.]/g, '-')}.json`;
      const file = new File(Paths.cache, filename);
      file.create({ overwrite: true });
      file.write(JSON.stringify(payload, null, 2));

      if (await isAvailableAsync()) {
        await shareAsync(file.uri);
      }
      return true;
    } catch (e) {
      setError(errorMessage(e, 'Export failed.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { run, isLoading, error };
}

/**
 * Two-step import: `pick()` opens the document picker and returns the parsed
 * payload plus a row-count preview (no data is touched yet); `confirm()` applies
 * it via `services/dataTransfer.service.importData` once the user has confirmed
 * the destructive-replace warning.
 */
export function useImportData() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = useCallback(async (): Promise<PickedImport | null> => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets?.[0]) return null;

      const text = await new File(result.assets[0].uri).text();
      const payload = JSON.parse(text) as ExportPayload;
      const summary: ImportSummary = {};
      for (const [table, rows] of Object.entries(payload.tables)) {
        summary[table as keyof ImportSummary] = rows?.length ?? 0;
      }
      return { payload, summary };
    } catch (e) {
      setError(errorMessage(e, 'Failed to read the selected file.'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirm = useCallback(async (payload: ExportPayload): Promise<ImportSummary | null> => {
    setError(null);
    setIsLoading(true);
    try {
      return await importData(payload);
    } catch (e) {
      setError(errorMessage(e, 'Import failed.'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { pick, confirm, isLoading, error };
}
