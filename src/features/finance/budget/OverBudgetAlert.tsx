import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Typography } from '@/components/Typography';
import { buildOverBudgetAlert } from '@/notifications/triggers/overBudget';
import { hapticWarning } from '@/utils/haptics';

export interface OverBudgetAlertProps {
  visible: boolean;
  /** Whole FCFA the prospective expense would exceed the expense budget by. */
  overage: number;
  /** Save the expense anyway. */
  onProceed: () => void;
  /** Dismiss without saving. */
  onCancel: () => void;
}

/**
 * In-app warning shown before an expense that would exceed the month's expense
 * budget is saved. Copy comes from the over-budget trigger (single source);
 * "Proceed anyway" commits the expense, "Cancel" returns to the form. This is a
 * modal, never a push notification (see `notifications/CLAUDE.md`).
 */
export function OverBudgetAlert({ visible, overage, onProceed, onCancel }: OverBudgetAlertProps) {
  const payload = buildOverBudgetAlert({ overage });

  // A cautionary buzz when the warning appears — the modal interrupts a save,
  // so it should feel different from a success.
  useEffect(() => {
    if (visible) hapticWarning();
  }, [visible]);

  return (
    <Modal visible={visible} onRequestClose={onCancel}>
      <View style={styles.content}>
        <Typography variant="subheading">{payload.title}</Typography>
        <Typography variant="muted">{payload.body}</Typography>
        <Button testID="over-budget-proceed" label="Proceed anyway" onPress={onProceed} />
        <Button testID="over-budget-cancel" label="Cancel" onPress={onCancel} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
});
