import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { SectionCard } from '@/components/SectionCard';
import { Typography } from '@/components/Typography';
import type { CloudSync } from '@/hooks/useCloudSync';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatDateLong } from '@/utils/formatDate';

export interface CloudBackupCardProps {
  cloud: CloudSync;
  /** When the cloud copy was last updated; overrides `cloud.lastSyncedAt` after a restore. */
  lastBackupAt: string | null;
  restoring: boolean;
  /** Disables both actions while a snapshot action is running. */
  disabled?: boolean;
  onRestore: () => void;
  onSignIn: () => void;
}

/**
 * The cloud half of Backup & Restore: account, last backup time, "Back up now"
 * (a full sync) and "Restore from cloud". Signed out, it points to Settings,
 * where the cloud account is managed.
 */
export function CloudBackupCard({
  cloud,
  lastBackupAt,
  restoring,
  disabled = false,
  onRestore,
  onSignIn,
}: CloudBackupCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('backup');

  if (!cloud.signedIn) {
    return (
      <SectionCard icon="cloud" title={t('cloud.title')} subtitle={t('cloud.signedOut')}>
        <Button testID="backup-cloud-sign-in" label={t('cloud.signIn')} onPress={onSignIn} />
      </SectionCard>
    );
  }

  const syncing = cloud.status === 'syncing';
  return (
    <SectionCard icon="cloud" title={t('cloud.title')} subtitle={t('cloud.subtitle')}>
      <Typography variant="muted">
        {t('cloud.signedInAs', { email: cloud.userEmail ?? '' })}
      </Typography>
      <Typography testID="backup-cloud-last">
        {lastBackupAt
          ? t('cloud.lastBackup', { date: formatDateLong(lastBackupAt) })
          : t('cloud.neverBackedUp')}
      </Typography>
      {cloud.status === 'error' && cloud.error ? (
        <Typography style={styles.error}>{cloud.error}</Typography>
      ) : null}
      <Button
        testID="backup-cloud-now"
        label={syncing ? t('cloud.backingUp') : t('cloud.backUpNow')}
        onPress={() => void cloud.syncNow()}
        disabled={syncing || restoring || disabled}
      />
      <Button
        testID="backup-cloud-restore"
        label={t('cloud.restore')}
        variant="secondary"
        onPress={onRestore}
        loading={restoring}
        disabled={syncing || disabled}
      />
    </SectionCard>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  error: { color: c.DANGER },
});
