import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Typography } from '@/components/Typography';
import { formatDateLong } from '@/utils/formatDate';

import type { TimelineShift } from './projects.types';

export interface TimelineRecalcAlertProps {
  /** The detected shift, or `null` to keep the alert hidden. */
  shift: TimelineShift | null;
  projectName: string;
  onAcceptDelay: () => void;
  onPullFromSavings: () => void;
  onReprioritize: () => void;
}

/**
 * Modal shown when a project's estimated completion moves beyond the threshold.
 * Presents the old vs new date and three responses: accept the delay (dismiss),
 * pull from savings (the caller navigates to the savings withdrawal flow), or
 * reprioritize (the caller opens the reorder UI). Renders nothing when `shift`
 * is `null`.
 */
export function TimelineRecalcAlert({
  shift,
  projectName,
  onAcceptDelay,
  onPullFromSavings,
  onReprioritize,
}: TimelineRecalcAlertProps) {
  if (!shift) return null;

  return (
    <Modal visible onRequestClose={onAcceptDelay}>
      <Typography variant="subheading">Project timeline changed</Typography>
      <Typography style={styles.body}>
        {`${projectName} moved from ${formatDateOrUnknown(shift.previous)} to ${formatDateOrUnknown(
          shift.next,
        )}.`}
      </Typography>
      <View style={styles.actions}>
        <Button label="Accept delay" onPress={onAcceptDelay} />
        <Button label="Pull from savings" onPress={onPullFromSavings} />
        <Button label="Reprioritize" onPress={onReprioritize} />
      </View>
    </Modal>
  );
}

function formatDateOrUnknown(date: string | null): string {
  return date ? formatDateLong(date) : 'an unknown date';
}

const styles = StyleSheet.create({
  body: {
    marginVertical: 8,
  },
  actions: {
    gap: 8,
  },
});
