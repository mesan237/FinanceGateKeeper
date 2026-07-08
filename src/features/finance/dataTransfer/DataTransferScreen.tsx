import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { useToast } from '@/components/Toast';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { useExportData, useImportData } from './dataTransfer.hooks';
import type { PickedImport } from './dataTransfer.types';

/**
 * Export writes a full local snapshot to a shareable JSON file. Import picks a
 * previously exported file, previews its per-table row counts, and — only after
 * a confirm-guarded warning — replaces all local data with that snapshot.
 */
export function DataTransferScreen() {
  const styles = useThemedStyles(makeStyles);
  const { show } = useToast();
  const exportData = useExportData();
  const importData = useImportData();
  const [picked, setPicked] = useState<PickedImport | null>(null);

  const handleExport = async () => {
    const ok = await exportData.run();
    show(ok ? 'Export ready — pick where to save it.' : (exportData.error ?? 'Export failed.'));
  };

  const handlePick = async () => {
    const result = await importData.pick();
    if (result) setPicked(result);
  };

  const handleConfirmImport = async () => {
    if (!picked) return;
    const summary = await importData.confirm(picked.payload);
    setPicked(null);
    show(summary ? 'Data restored from backup.' : (importData.error ?? 'Import failed.'));
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Export & Import" />

      <SectionCard
        icon="export"
        title="Export"
        subtitle="Save all your data to a file you can back up or share."
      >
        <Button
          testID="data-transfer-export"
          label="Export data"
          onPress={() => void handleExport()}
          loading={exportData.isLoading}
        />
      </SectionCard>

      <SectionCard
        icon="backup"
        title="Import"
        subtitle="Restore your data from a previously exported file."
      >
        <Button
          testID="data-transfer-import-pick"
          label="Choose a file to import"
          variant="secondary"
          onPress={() => void handlePick()}
          loading={importData.isLoading}
        />
      </SectionCard>

      <Modal visible={picked !== null} onRequestClose={() => setPicked(null)}>
        <View style={styles.confirmModal}>
          <Typography variant="subheading">Replace all data on this device?</Typography>
          <Typography variant="muted">
            This overwrites everything currently on this device with the contents of the
            selected file. This cannot be undone.
          </Typography>
          {picked
            ? Object.entries(picked.summary).map(([table, count]) => (
                <Typography key={table} variant="muted">
                  {table}: {count}
                </Typography>
              ))
            : null}
          <Button
            testID="data-transfer-import-confirm"
            label="Replace data"
            variant="danger"
            loading={importData.isLoading}
            onPress={() => void handleConfirmImport()}
          />
          <Button
            testID="data-transfer-import-cancel"
            label="Cancel"
            variant="ghost"
            onPress={() => setPicked(null)}
          />
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (_c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  confirmModal: { gap: 10 },
});
