import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { SectionCard } from '@/components/SectionCard';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { ACCOUNT_DELETION_URL } from '@/constants/legal';
import type { CloudSync } from '@/hooks/useCloudSync';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatDateLong } from '@/utils/formatDate';

export interface CloudBackupCardProps {
  cloud: CloudSync;
  /** When the cloud copy was last updated; overrides `cloud.lastSyncedAt` after a restore. */
  lastBackupAt: string | null;
  restoring: boolean;
  /** Disables every action while a snapshot action is running. */
  disabled?: boolean;
  onRestore: () => void;
}

/**
 * The cloud half of Backup & Restore and the only place the cloud account is
 * managed. Signed in: account, last backup time, "Back up now" (a full sync),
 * "Restore from cloud", Sign out, and "Delete my account" (opens the published
 * deletion steps, as Google Play requires). Signed out: an email/password form to sign
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

  const { authAction } = cloud;
  const syncing = cloud.status === 'syncing';
  // One cloud action at a time: the one running shows a spinner, the others are disabled.
  const blocked = disabled || restoring || syncing || authAction !== null;

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
          editable={authAction === null}
          accessibilityLabel={t('cloud.emailLabel')}
        />
        <TextInput
          testID="backup-cloud-password"
          value={password}
          onChangeText={setPassword}
          placeholder={t('cloud.password')}
          secureTextEntry
          editable={authAction === null}
          accessibilityLabel={t('cloud.passwordLabel')}
        />
        {cloud.error ? <Typography style={styles.error}>{cloud.error}</Typography> : null}
        <Button
          testID="backup-cloud-sign-in"
          label={t('cloud.signIn')}
          onPress={() => void cloud.signIn(email, password)}
          loading={authAction === 'sign-in'}
          disabled={blocked}
        />
        <Button
          testID="backup-cloud-sign-up"
          label={t('cloud.signUp')}
          variant="secondary"
          compact
          onPress={() => void cloud.signUp(email, password)}
          loading={authAction === 'sign-up'}
          disabled={blocked}
        />
      </SectionCard>
    );
  }

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
      {cloud.error ? <Typography style={styles.error}>{cloud.error}</Typography> : null}
      <Button
        testID="backup-cloud-now"
        label={t('cloud.backUpNow')}
        onPress={() => void cloud.syncNow()}
        loading={syncing}
        disabled={blocked}
      />
      <Button
        testID="backup-cloud-restore"
        label={t('cloud.restore')}
        variant="secondary"
        onPress={onRestore}
        loading={restoring}
        disabled={blocked}
      />
      <Button
        testID="backup-cloud-sign-out"
        label={t('cloud.signOut')}
        variant="secondary"
        compact
        onPress={() => void cloud.signOut()}
        loading={authAction === 'sign-out'}
        disabled={blocked}
      />
      <Button
        testID="backup-cloud-delete-account"
        label={t('cloud.deleteAccount')}
        variant="danger"
        compact
        onPress={() => void Linking.openURL(ACCOUNT_DELETION_URL)}
        disabled={blocked}
      />
      <Typography variant="muted">{t('cloud.deleteAccountNote')}</Typography>
    </SectionCard>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  error: { color: c.DANGER },
});
