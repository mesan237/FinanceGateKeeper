import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '@/components/Typography';
import { Keypad } from '@/features/finance/auth/Keypad';
import { useAuth } from '@/features/finance/auth/auth.hooks';
import { BACKGROUND, DANGER, TEXT_MUTED, TEXT_PRIMARY } from '@/constants/colors';

const PIN_LENGTH = 4;

type Step = 'create' | 'confirm' | 'unlock';

const COPY: Record<Step, { title: string; subtitle: string }> = {
  create: { title: 'Create a PIN', subtitle: 'Pick a 4-digit code to unlock the app.' },
  confirm: { title: 'Confirm your PIN', subtitle: 'Enter the same 4 digits again.' },
  unlock: { title: 'Enter your PIN', subtitle: 'Welcome back.' },
};

/**
 * PIN entry surface. Shows the first-time setup flow (create + confirm) when no
 * PIN is stored, otherwise the unlock flow. Locks the keypad and shows a
 * countdown while the auth provider is in cooldown after repeated wrong PINs.
 */
export function AuthScreen() {
  const { isReady, hasPin, cooldownUntilMs, setupPin, unlock } = useAuth();
  const [step, setStep] = useState<Step>('unlock');
  const [buffer, setBuffer] = useState('');
  const [savedPin, setSavedPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setStep(hasPin ? 'unlock' : 'create');
    setBuffer('');
    setSavedPin('');
    setError(null);
  }, [hasPin]);

  useEffect(() => {
    if (cooldownUntilMs === null) return;
    const id = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(id);
  }, [cooldownUntilMs]);

  const inCooldown = cooldownUntilMs !== null && cooldownUntilMs > nowMs;
  const cooldownSecondsLeft = inCooldown
    ? Math.ceil(((cooldownUntilMs ?? 0) - nowMs) / 1000)
    : 0;

  const completePin = useCallback(
    async (pin: string) => {
      setError(null);
      if (step === 'create') {
        setSavedPin(pin);
        setStep('confirm');
        setBuffer('');
        return;
      }
      if (step === 'confirm') {
        if (pin === savedPin) {
          await setupPin(pin);
          return;
        }
        setError('PINs do not match. Try again.');
        setSavedPin('');
        setStep('create');
        setBuffer('');
        return;
      }
      const ok = await unlock(pin);
      if (!ok) {
        setError('Wrong PIN.');
        setBuffer('');
      }
    },
    [savedPin, setupPin, step, unlock],
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (inCooldown) return;
      setBuffer((current) => {
        if (current.length >= PIN_LENGTH) return current;
        const next = current + digit;
        if (next.length === PIN_LENGTH) {
          completePin(next);
        }
        return next;
      });
    },
    [completePin, inCooldown],
  );

  const handleBackspace = useCallback(() => {
    if (inCooldown) return;
    setError(null);
    setBuffer((current) => current.slice(0, -1));
  }, [inCooldown]);

  if (!isReady) return null;

  const copy = COPY[step];

  return (
    <SafeAreaView style={styles.container} testID="auth-screen">
      <View style={styles.header}>
        <Typography variant="heading">{copy.title}</Typography>
        <Typography variant="muted">{copy.subtitle}</Typography>
      </View>
      <View style={styles.dots} accessibilityLabel={`PIN length ${buffer.length} of ${PIN_LENGTH}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, i < buffer.length && styles.dotFilled]} />
        ))}
      </View>
      {error !== null && (
        <Typography style={styles.error} testID="auth-error">
          {error}
        </Typography>
      )}
      {inCooldown && (
        <Typography style={styles.cooldown} testID="auth-cooldown">
          {`Too many wrong attempts. Try again in ${cooldownSecondsLeft}s.`}
        </Typography>
      )}
      <Keypad onDigit={handleDigit} onBackspace={handleBackspace} disabled={inCooldown} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  dots: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: TEXT_MUTED,
  },
  dotFilled: {
    backgroundColor: TEXT_PRIMARY,
    borderColor: TEXT_PRIMARY,
  },
  error: {
    color: DANGER,
    marginBottom: 12,
  },
  cooldown: {
    color: DANGER,
    marginBottom: 12,
  },
});
