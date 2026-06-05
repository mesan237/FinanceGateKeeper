import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Typography } from '@/components/Typography';

export interface ZeroDayPromptProps {
  visible: boolean;
  /** Records a zero-day for today. */
  onConfirm: () => void | Promise<void>;
  /** Dismisses the prompt (without recording a zero-day). */
  onClose: () => void;
}

/**
 * Modal asking the user to confirm a no-spend day. "Confirm" records a zero-day
 * (so the prompt won't reappear today); "Let me log" closes the prompt and
 * navigates to the expense form.
 */
export function ZeroDayPrompt({ visible, onConfirm, onClose }: ZeroDayPromptProps) {
  const router = useRouter();

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={styles.content}>
        <Typography variant="subheading">Did you spend nothing today?</Typography>
        <Typography variant="muted">
          Confirm a zero-spend day, or log what you spent.
        </Typography>
        <Button
          testID="zero-day-confirm"
          label="Yes, I spent nothing"
          onPress={() => {
            void onConfirm();
          }}
        />
        <Button
          testID="zero-day-log"
          label="Let me log"
          onPress={() => {
            onClose();
            router.push('/expenses/log');
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
});
