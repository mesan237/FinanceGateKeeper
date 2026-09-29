import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { SectionCard } from '@/components/SectionCard';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { useCloudSync } from '@/hooks/useCloudSync';
import { formatDateLong } from '@/utils/formatDate';

export interface CloudAccountCardProps {
  /** Prefix for the card's testIDs, so multiple screens can host it. */
  testIDPrefix?: string;
}

/**
 * The cloud-backup account section: shows the signed-in email with sync status
 * and Sign out, or an email/password form to sign in / create an account when
 * signed out. Shared by Settings and Profile so the controls stay identical.
 */
export function CloudAccountCard({ testIDPrefix = 'settings' }: CloudAccountCardProps) {
  const cloud = useCloudSync();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SectionCard
      icon="cloud"
      title={t('cloud.title')}
      subtitle={cloud.signedIn ? undefined : t('cloud.subtitle')}
    >
      {cloud.signedIn ? (
        <>
          <View style={styles.accountRow}>
            <View style={styles.accountText}>
              <Typography variant="muted">{t('cloud.signedInAs')}</Typography>
              <Typography>{cloud.userEmail ?? t('cloud.yourAccount')}</Typography>
            </View>
            {cloud.lastSyncedAt ? (
              <Typography
                testID={`${testIDPrefix}-last-synced`}
                variant="muted"
                style={styles.syncStamp}
              >
                {t('cloud.syncedOn', { date: formatDateLong(cloud.lastSyncedAt) })}
              </Typography>
            ) : (
              <Typography variant="muted">{t('cloud.notSynced')}</Typography>
            )}
          </View>
          {cloud.status === 'error' && cloud.error ? (
            <Typography style={styles.error}>{cloud.error}</Typography>
          ) : null}
          <Button
            testID={`${testIDPrefix}-sync-now`}
            label={cloud.status === 'syncing' ? t('cloud.syncing') : t('cloud.syncNow')}
            onPress={() => void cloud.syncNow()}
            disabled={cloud.status === 'syncing'}
          />
          <Button
            testID={`${testIDPrefix}-sign-out`}
            label={t('cloud.signOut')}
            variant="secondary"
            compact
            onPress={() => void cloud.signOut()}
          />
        </>
      ) : (
        <>
          <TextInput
            testID={`${testIDPrefix}-cloud-email`}
            value={email}
            onChangeText={setEmail}
            placeholder={t('cloud.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel={t('cloud.emailLabel')}
          />
          <TextInput
            testID={`${testIDPrefix}-cloud-password`}
            value={password}
            onChangeText={setPassword}
            placeholder={t('cloud.password')}
            secureTextEntry
            accessibilityLabel={t('cloud.passwordLabel')}
          />
          {cloud.error ? <Typography style={styles.error}>{cloud.error}</Typography> : null}
          <Button
            testID={`${testIDPrefix}-sign-in`}
            label={t('cloud.signIn')}
            onPress={() => void cloud.signIn(email, password)}
          />
          <Button
            testID={`${testIDPrefix}-sign-up`}
            label={t('cloud.signUp')}
            variant="secondary"
            compact
            onPress={() => void cloud.signUp(email, password)}
          />
        </>
      )}
    </SectionCard>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    accountRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    accountText: {
      gap: 2,
      flexShrink: 1,
    },
    syncStamp: {
      textAlign: 'right',
      flexShrink: 1,
    },
    error: {
      color: c.DANGER,
    },
  });
