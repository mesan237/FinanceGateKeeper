import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { useCloudRestore, useSnapshots } from './backup.hooks';
import type { CloudRestoreError, PendingAction } from './backup.types';
import { CloudBackupCard } from './CloudBackupCard';
import { ConfirmActionModal } from './ConfirmActionModal';
import { SnapshotList } from './SnapshotList';

const CLOUD_ERROR_KEYS = {
  'not-signed-in': 'cloudErrors.notSignedIn',
  'cloud-error': 'cloudErrors.cloudError',
  'cloud-empty': 'cloudErrors.cloudEmpty',
  'restore-failed': 'cloudErrors.restoreFailed',
} as const satisfies Record<CloudRestoreError, string>;

/**
 * Backup & Restore: the cloud backup (status, back up now, restore from cloud)
 * and the automatic on-phone snapshots (take one, restore one, delete one).
 * Every restore and delete goes through a confirm modal first, and every
 * restore saves a "before restore" snapshot, so it can be undone from the list.
 */
export function BackupScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('backup');
  const router = useRouter();
  const { show } = useToast();
  const cloud = useCloudSync();
  const snapshots = useSnapshots();
  const cloudRestore = useCloudRestore();
  const [pending, setPending] = useState<PendingAction | null>(null);
  // `useCloudSync` reads the backup time once on mount; a cloud restore moves it.
  const [restoredSyncAt, setRestoredSyncAt] = useState<string | null>(null);

  const handleCreate = async () => {
    const ok = await snapshots.create();
    show(ok ? t('toasts.snapshotTaken') : t('toasts.snapshotFailed'));
  };

  const handleRestoreFromCloud = async () => {
    const result = await cloudRestore.restore();
    await snapshots.refresh();
    if (!result.ok) {
      show(t(CLOUD_ERROR_KEYS[result.error ?? 'restore-failed']));
      return;
    }
    setRestoredSyncAt(result.lastSyncedAt);
    show(t('toasts.cloudRestored'));
  };

  const handleConfirm = async () => {
    const action = pending;
    setPending(null);
    if (!action) return;
    if (action.kind === 'restore-cloud') {
      await handleRestoreFromCloud();
      return;
    }
    if (action.kind === 'delete-snapshot') {
      const ok = await snapshots.remove(action.snapshot.id);
      show(ok ? t('toasts.deleted') : t('toasts.deleteFailed'));
      return;
    }
    const ok = await snapshots.restore(action.snapshot.id);
    show(ok ? t('toasts.snapshotRestored') : t('toasts.restoreFailed'));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader title={t('title')} />

      <CloudBackupCard
        cloud={cloud}
        lastBackupAt={restoredSyncAt ?? cloud.lastSyncedAt}
        restoring={cloudRestore.isRestoring}
        // Restores share one SQLite connection: never let two run at once.
        disabled={snapshots.isBusy}
        onRestore={() => setPending({ kind: 'restore-cloud' })}
        onSignIn={() => router.push('/settings')}
      />

      <SnapshotList
        snapshots={snapshots.snapshots}
        busy={snapshots.isBusy || cloudRestore.isRestoring}
        onCreate={() => void handleCreate()}
        onRestore={(snapshot) => setPending({ kind: 'restore-snapshot', snapshot })}
        onDelete={(snapshot) => setPending({ kind: 'delete-snapshot', snapshot })}
      />

      <ConfirmActionModal
        action={pending}
        signedIn={cloud.signedIn}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setPending(null)}
      />
    </ScrollView>
  );
}

const makeStyles = (_c: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
});
