import React, { useState } from 'react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SectionCard
      icon="cloud"
      title="Cloud backup"
      subtitle={
        cloud.signedIn
          ? undefined
          : 'Back up your data to the cloud and restore it on a new device.'
      }
    >
      {cloud.signedIn ? (
        <>
          <View style={styles.accountRow}>
            <View style={styles.accountText}>
              <Typography variant="muted">Signed in as</Typography>
              <Typography>{cloud.userEmail ?? 'your account'}</Typography>
            </View>
            {cloud.lastSyncedAt ? (
              <Typography
                testID={`${testIDPrefix}-last-synced`}
                variant="muted"
                style={styles.syncStamp}
              >
                Synced {formatDateLong(cloud.lastSyncedAt)}
              </Typography>
            ) : (
              <Typography variant="muted">Not synced yet.</Typography>
            )}
          </View>
          {cloud.status === 'error' && cloud.error ? (
            <Typography style={styles.error}>{cloud.error}</Typography>
          ) : null}
          <Button
            testID={`${testIDPrefix}-sync-now`}
            label={cloud.status === 'syncing' ? 'Syncing…' : 'Sync now'}
            onPress={() => void cloud.syncNow()}
            disabled={cloud.status === 'syncing'}
          />
          <Button
            testID={`${testIDPrefix}-sign-out`}
            label="Sign out"
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
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Cloud account email"
          />
          <TextInput
            testID={`${testIDPrefix}-cloud-password`}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            accessibilityLabel="Cloud account password"
          />
          {cloud.error ? <Typography style={styles.error}>{cloud.error}</Typography> : null}
          <Button
            testID={`${testIDPrefix}-sign-in`}
            label="Sign in"
            onPress={() => void cloud.signIn(email, password)}
          />
          <Button
            testID={`${testIDPrefix}-sign-up`}
            label="Create account"
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
