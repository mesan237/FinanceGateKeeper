import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Typography } from '@/components/Typography';

import type { PendingAction } from './backup.types';
import { snapshotTimeLabel } from './SnapshotList';

export interface ConfirmActionModalProps {
  action: PendingAction | null;
  /** Signed in, a snapshot restore also explains what happens to cloud-only records. */
  signedIn: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Spells out what a restore or delete will change before it runs: a snapshot
 * restore, a restore from the cloud, or deleting a snapshot.
 */
export function ConfirmActionModal({ action, signedIn, onConfirm, onCancel }: ConfirmActionModalProps) {
  const { t } = useTranslation(['backup', 'common']);

  const copy = (() => {
    if (!action) return null;
    if (action.kind === 'restore-cloud') {
      return {
        title: t('confirm.cloudTitle'),
        body: [t('confirm.cloudBody')],
        confirm: t('confirm.cloudConfirm'),
      };
    }
    const date = snapshotTimeLabel(action.snapshot.createdAt);
    if (action.kind === 'delete-snapshot') {
      return {
        title: t('confirm.deleteTitle'),
        body: [t('confirm.deleteBody', { date })],
        confirm: t('common:actions.delete'),
      };
    }
    return {
      title: t('confirm.snapshotTitle'),
      body: [
        t('confirm.snapshotBody', { date }),
        ...(signedIn ? [t('confirm.snapshotCloudNote')] : []),
      ],
      confirm: t('confirm.snapshotConfirm'),
    };
  })();

  return (
    <Modal visible={action !== null} onRequestClose={onCancel}>
      {copy ? (
        <View style={styles.body}>
          <Typography variant="subheading">{copy.title}</Typography>
          {copy.body.map((line) => (
            <Typography key={line} variant="muted">
              {line}
            </Typography>
          ))}
          <Button testID="backup-confirm" label={copy.confirm} variant="danger" onPress={onConfirm} />
          <Button
            testID="backup-cancel"
            label={t('common:actions.cancel')}
            variant="ghost"
            onPress={onCancel}
          />
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
});
