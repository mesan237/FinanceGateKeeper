import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { resetLocalData } from '@/services/database';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { useAuthLock } from './AuthProvider';

export interface PinRecoveryScreenProps {
  /** Returns to the unlock screen (which shows PIN setup once the PIN is reset). */
  onClose: () => void;
}

/**
 * "Forgot PIN?" recovery. The PIN is a device-local lock, so the cloud account
 * is the identity anchor: re-authenticating with the cloud password clears the
 * PIN without touching data. Users who never set up cloud backup have nothing to
 * verify against, so their only safe option is to erase the device's data — a
 * confirm-guarded last resort. Either path ends by resetting the PIN and
 * returning to setup.
 */
export function PinRecoveryScreen({ onClose }: PinRecoveryScreenProps) {
  const cloud = useCloudSync();
  const { resetPin } = useAuthLock();
  const styles = useThemedStyles(makeStyles);

  const [phase, setPhase] = useState<'verify' | 'wipe'>('verify');
  const [email, setEmail] = useState(cloud.userEmail ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const verifyAndReset = async () => {
    setError(null);
    setBusy(true);
    const targetEmail = cloud.signedIn ? cloud.userEmail ?? email : email;
    const ok = await cloud.signIn(targetEmail, password);
    if (ok) {
      await resetPin();
      onClose();
      return;
    }
    setError(cloud.error ?? "Couldn't verify your account. Check your details.");
    setBusy(false);
  };

  const wipeAndReset = async () => {
    setBusy(true);
    await resetLocalData();
    await resetPin();
    onClose();
  };

  if (phase === 'wipe') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Typography variant="display" style={styles.center}>
            Erase this device?
          </Typography>
          <Typography variant="muted" style={styles.center}>
            This permanently deletes all data on this device and removes the PIN. This cannot be
            undone. Cloud backups, if any, are not affected.
          </Typography>
        </View>
        <View style={styles.body}>
          {error ? (
            <Typography testID="recovery-error" style={styles.error}>
              {error}
            </Typography>
          ) : null}
          <Button
            testID="recovery-wipe-confirm"
            label="Erase everything"
            variant="danger"
            loading={busy}
            onPress={() => void wipeAndReset()}
          />
          <Button
            testID="recovery-wipe-cancel"
            label="Go back"
            variant="ghost"
            onPress={() => setPhase('verify')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="display" style={styles.center}>
          Reset your PIN
        </Typography>
        <Typography variant="muted" style={styles.center}>
          {cloud.signedIn
            ? `Confirm the password for ${cloud.userEmail ?? 'your cloud account'} to reset your PIN.`
            : 'Sign in to your cloud account to verify it’s you and reset your PIN.'}
        </Typography>
      </View>

      <View style={styles.body}>
        {!cloud.signedIn ? (
          <TextInput
            testID="recovery-email"
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Cloud account email"
          />
        ) : null}
        <TextInput
          testID="recovery-password"
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          accessibilityLabel="Cloud account password"
        />
        {error ? (
          <Typography testID="recovery-error" style={styles.error}>
            {error}
          </Typography>
        ) : null}
        <Button
          testID="recovery-submit"
          label={cloud.signedIn ? 'Verify & reset PIN' : 'Sign in & reset PIN'}
          loading={busy}
          onPress={() => void verifyAndReset()}
        />
        <Button
          testID="recovery-wipe-start"
          label="No cloud account? Erase & start over"
          variant="ghost"
          compact
          onPress={() => setPhase('wipe')}
        />
        <Button testID="recovery-cancel" label="Back to unlock" variant="ghost" onPress={onClose} />
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.BACKGROUND,
      paddingHorizontal: 24,
      paddingTop: 72,
      paddingBottom: 48,
      justifyContent: 'space-between',
    },
    header: {
      gap: 8,
    },
    center: {
      textAlign: 'center',
    },
    body: {
      gap: 12,
    },
    error: {
      color: c.DANGER,
      textAlign: 'center',
    },
  });
