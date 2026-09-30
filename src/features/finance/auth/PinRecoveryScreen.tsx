import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { KeyboardAvoider } from '@/components/KeyboardAvoider';
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
  const { t } = useTranslation('auth');

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
    setError(cloud.error ?? t('recovery.verifyFailed'));
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
            {t('recovery.wipeTitle')}
          </Typography>
          <Typography variant="muted" style={styles.center}>
            {t('recovery.wipeBody')}
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
            label={t('recovery.wipeConfirm')}
            variant="danger"
            loading={busy}
            onPress={() => void wipeAndReset()}
          />
          <Button
            testID="recovery-wipe-cancel"
            label={t('recovery.wipeCancel')}
            variant="ghost"
            onPress={() => setPhase('verify')}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoider>
      <View style={styles.container}>
        <View style={styles.header}>
          <Typography variant="display" style={styles.center}>
            {t('recovery.title')}
          </Typography>
          <Typography variant="muted" style={styles.center}>
            {cloud.signedIn
              ? t('recovery.subtitleSignedIn', {
                  email: cloud.userEmail ?? t('recovery.yourCloudAccount'),
                })
              : t('recovery.subtitleSignedOut')}
          </Typography>
        </View>

        <View style={styles.body}>
          {!cloud.signedIn ? (
            <TextInput
              testID="recovery-email"
              value={email}
              onChangeText={setEmail}
              placeholder={t('cloud.email')}
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel={t('cloud.emailLabel')}
            />
          ) : null}
          <TextInput
            testID="recovery-password"
            value={password}
            onChangeText={setPassword}
            placeholder={t('cloud.password')}
            secureTextEntry
            accessibilityLabel={t('cloud.passwordLabel')}
          />
          {error ? (
            <Typography testID="recovery-error" style={styles.error}>
              {error}
            </Typography>
          ) : null}
          <Button
            testID="recovery-submit"
            label={cloud.signedIn ? t('recovery.submitSignedIn') : t('recovery.submitSignedOut')}
            loading={busy}
            onPress={() => void verifyAndReset()}
          />
          <Button
            testID="recovery-wipe-start"
            label={t('recovery.wipeStart')}
            variant="ghost"
            compact
            onPress={() => setPhase('wipe')}
          />
          <Button testID="recovery-cancel" label={t('recovery.backToUnlock')} variant="ghost" onPress={onClose} />
        </View>
      </View>
    </KeyboardAvoider>
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
