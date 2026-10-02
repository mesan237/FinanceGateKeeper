import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { SectionCard } from '@/components/SectionCard';
import { TextInput } from '@/components/TextInput';
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
}

/**
 * The cloud half of Backup & Restore and the only place the cloud account is
 * managed. Signed in: account, last backup time, "Back up now" (a full sync),
 * "Restore from cloud" and Sign out. Signed out: an email/password form to sign
 * in or create an account.
 */
export function CloudBackupCard({
  cloud,
  lastBackupAt,
  restoring,
  disabled = false,
  onRestore,
}: CloudBackupCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('backup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!cloud.signedIn) {
    return (
      <SectionCard icon="cloud" title={t('cloud.title')} subtitle={t('cloud.signedOut')}>
        <TextInput
          testID="backup-cloud-email"
          value={email}
          onChangeText={setEmail}
          placeholder={t('cloud.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel={t('cloud.emailLabel')}
        />
        <TextInput
          testID="backup-cloud-password"
          value={password}
          onChangeText={setPassword}
          placeholder={t('cloud.password')}
          secureTextEntry
          accessibilityLabel={t('cloud.passwordLabel')}
        />
        {cloud.error ? <Typography style={styles.error}>{cloud.error}</Typography> : null}
        <Button
          testID="backup-cloud-sign-in"
          label={t('cloud.signIn')}
          onPress={() => void cloud.signIn(email, password)}
        />
        <Button
          testID="backup-cloud-sign-up"
          label={t('cloud.signUp')}
          variant="secondary"
          compact
          onPress={() => void cloud.signUp(email, password)}
        />
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
      <Button
        testID="backup-cloud-sign-out"
        label={t('cloud.signOut')}
        variant="secondary"
        compact
        onPress={() => void cloud.signOut()}
        disabled={syncing || restoring}
      />
    </SectionCard>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  error: { color: c.DANGER },
});
