import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { useToast } from '@/components/Toast';
import { Typography } from '@/components/Typography';
import { isSyncedTable } from '@/services/dataTransfer.types';
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
  const { t } = useTranslation(['dataTransfer', 'common']);
  const { show } = useToast();
  const exportData = useExportData();
  const importData = useImportData();
  const [picked, setPicked] = useState<PickedImport | null>(null);

  // Known tables get a readable name; anything else shows as stored.
  const tableLabel = (table: string): string =>
    isSyncedTable(table) ? t(`tables.${table}`) : table;

  const handleExport = async () => {
    const ok = await exportData.run();
    show(ok ? t('exportReady') : (exportData.error ?? t('exportFailed')));
  };

  const handlePick = async () => {
    const result = await importData.pick();
    if (result) setPicked(result);
  };

  const handleConfirmImport = async () => {
    if (!picked) return;
    const summary = await importData.confirm(picked.payload);
    setPicked(null);
    show(summary ? t('importDone') : (importData.error ?? t('importFailed')));
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('title')} />

      <SectionCard
        icon="export"
        title={t('exportTitle')}
        subtitle={t('exportSubtitle')}
      >
        <Button
          testID="data-transfer-export"
          label={t('exportButton')}
          onPress={() => void handleExport()}
          loading={exportData.isLoading}
        />
      </SectionCard>

      <SectionCard
        icon="backup"
        title={t('importTitle')}
        subtitle={t('importSubtitle')}
      >
        <Button
          testID="data-transfer-import-pick"
          label={t('importButton')}
          variant="secondary"
          onPress={() => void handlePick()}
          loading={importData.isLoading}
        />
      </SectionCard>

      <Modal visible={picked !== null} onRequestClose={() => setPicked(null)}>
        <View style={styles.confirmModal}>
          <Typography variant="subheading">{t('confirmTitle')}</Typography>
          <Typography variant="muted">{t('confirmBody')}</Typography>
          {picked
            ? Object.entries(picked.summary).map(([table, count]) => (
                <Typography key={table} variant="muted">
                  {tableLabel(table)}: {count}
                </Typography>
              ))
            : null}
          <Button
            testID="data-transfer-import-confirm"
            label={t('confirmReplace')}
            variant="danger"
            loading={importData.isLoading}
            onPress={() => void handleConfirmImport()}
          />
          <Button
            testID="data-transfer-import-cancel"
            label={t('common:actions.cancel')}
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
