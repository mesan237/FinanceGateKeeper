import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { useAuthLock } from './AuthProvider';
import { PinKeypad } from './PinKeypad';
import { PinRecoveryScreen } from './PinRecoveryScreen';

const PIN_LENGTH = 4;

function secondsLeft(cooldownUntil: number | null): number {
  if (cooldownUntil == null) return 0;
  return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
}

/**
 * The PIN gate. In setup mode (no PIN yet) it walks the user through entering
 * and confirming a new PIN; in unlock mode it verifies entries, surfaces the
 * remaining attempts, and shows a live countdown while the lock is cooling down
 * after three wrong tries. Submits automatically once four digits are entered.
 */
export function AuthScreen() {
  const { pinState, attemptsLeft, cooldownUntil, setupPin, unlock } = useAuthLock();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('auth');

  const isSetup = pinState === 'unset';
  const [entry, setEntry] = useState('');
  const [firstEntry, setFirstEntry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [cooldown, setCooldown] = useState(() => secondsLeft(cooldownUntil));

  // Tick the cooldown countdown down to zero, then re-enable the keypad.
  useEffect(() => {
    setCooldown(secondsLeft(cooldownUntil));
    if (cooldownUntil == null) return;
    const id = setInterval(() => {
      const left = secondsLeft(cooldownUntil);
      setCooldown(left);
      if (left <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const handleChange = async (next: string) => {
    setError(null);
    setEntry(next);
    if (next.length < PIN_LENGTH) return;

    if (isSetup) {
      if (firstEntry == null) {
        setFirstEntry(next);
        setEntry('');
        return;
      }
      if (next === firstEntry) {
        await setupPin(next);
      } else {
        setError(t('pin.mismatch'));
        setFirstEntry(null);
        setEntry('');
      }
      return;
    }

    const ok = await unlock(next);
    if (!ok) setError(t('pin.wrong'));
    setEntry('');
  };

  if (recovering) {
    return <PinRecoveryScreen onClose={() => setRecovering(false)} />;
  }

  const inCooldown = cooldown > 0;
  const confirming = isSetup && firstEntry != null;

  let title: string;
  let subtitle: string;
  if (isSetup) {
    title = confirming ? t('pin.confirmTitle') : t('pin.createTitle');
    subtitle = confirming ? t('pin.confirmSubtitle') : t('pin.createSubtitle');
  } else {
    title = t('pin.unlockTitle');
    subtitle = t('pin.unlockSubtitle');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="display" style={styles.center}>
          {title}
        </Typography>
        <Typography variant="muted" style={styles.center}>
          {subtitle}
        </Typography>
      </View>

      <View style={styles.body}>
        <PinKeypad value={entry} onChange={(n) => void handleChange(n)} disabled={inCooldown} />

        <View style={styles.status}>
          {inCooldown ? (
            <Typography testID="auth-cooldown" style={styles.error}>
              {t('pin.cooldown', { seconds: cooldown })}
            </Typography>
          ) : error ? (
            <Typography testID="auth-error" style={styles.error}>
              {error}
              {!isSetup && attemptsLeft < 3 ? ` ${t('pin.attemptsLeft', { count: attemptsLeft })}` : ''}
            </Typography>
          ) : null}
        </View>

        {!isSetup ? (
          <Pressable
            testID="auth-forgot-pin"
            accessibilityRole="button"
            onPress={() => setRecovering(true)}
            style={styles.forgot}
          >
            <Typography variant="muted" style={styles.forgotText}>
              {t('pin.forgot')}
            </Typography>
          </Pressable>
        ) : null}
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
      gap: 24,
    },
    status: {
      minHeight: 24,
      alignItems: 'center',
    },
    error: {
      color: c.DANGER,
      textAlign: 'center',
    },
    forgot: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    forgotText: {
      color: c.PRIMARY_GREEN,
    },
  });
