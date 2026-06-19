import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { PinKeypad } from './PinKeypad';
import { changePin, verifyPin } from './auth.service';

const PIN_LENGTH = 4;
type Step = 'current' | 'new' | 'confirm';

const COPY: Record<Step, { title: string; subtitle: string }> = {
  current: { title: 'Enter current PIN', subtitle: 'Confirm it’s you before changing the PIN.' },
  new: { title: 'Choose a new PIN', subtitle: 'Pick a new 4-digit PIN.' },
  confirm: { title: 'Confirm new PIN', subtitle: 'Enter the new PIN again.' },
};

/**
 * Three-step PIN change: verify the current PIN, choose a new one, then confirm
 * it. The current PIN is checked up front (immediate feedback); the change is
 * committed via `changePin`, which re-checks the current PIN at the service
 * layer. On success it navigates back.
 */
export function ChangePinScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  const [step, setStep] = useState<Step>('current');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleChange = async (value: string) => {
    setError(null);
    setEntry(value);
    if (value.length < PIN_LENGTH) return;

    if (step === 'current') {
      if (await verifyPin(value)) {
        setCurrent(value);
        setStep('new');
      } else {
        setError('Wrong PIN.');
      }
      setEntry('');
      return;
    }

    if (step === 'new') {
      setNext(value);
      setStep('confirm');
      setEntry('');
      return;
    }

    // step === 'confirm'
    if (value === next) {
      await changePin(current, value);
      setDone(true);
      router.back();
    } else {
      setError('PINs do not match. Try again.');
      setStep('new');
      setNext('');
    }
    setEntry('');
  };

  const { title, subtitle } = COPY[step];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Change PIN" />
      <View style={styles.header}>
        <Typography variant="display" style={styles.center}>
          {title}
        </Typography>
        <Typography variant="muted" style={styles.center}>
          {subtitle}
        </Typography>
      </View>

      <View style={styles.body}>
        <PinKeypad value={entry} onChange={(n) => void handleChange(n)} disabled={done} />
        <View style={styles.status}>
          {error ? (
            <Typography testID="change-pin-error" style={styles.error}>
              {error}
            </Typography>
          ) : null}
        </View>
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
  });
