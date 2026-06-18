import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { formatCurrency } from '@/utils/formatCurrency';

import type { Project, ProjectPatch } from './projects.types';

interface EditProjectModalProps {
  visible: boolean;
  project: Project;
  onClose: () => void;
  onSubmit: (patch: ProjectPatch) => void | Promise<void>;
}

/** Edit name, target, and deadline. Mirrors the create form's validation. */
export function EditProjectModal({ visible, project, onClose, onSubmit }: EditProjectModalProps) {
  const [name, setName] = useState(project.name);
  const [target, setTarget] = useState(String(project.targetAmount));
  const [deadline, setDeadline] = useState(project.deadline ?? '');

  // Re-seed the fields whenever the modal opens for the current project.
  useEffect(() => {
    if (visible) {
      setName(project.name);
      setTarget(String(project.targetAmount));
      setDeadline(project.deadline ?? '');
    }
  }, [visible, project]);

  const parsedTarget = Number(target);
  const valid = name.trim().length > 0 && Number.isInteger(parsedTarget) && parsedTarget > 0;

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={styles.body}>
        <Typography variant="subheading">Edit project</Typography>
        <TextInput
          testID="edit-name"
          placeholder="Name"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Name"
        />
        <TextInput
          testID="edit-target"
          placeholder="Target amount (FCFA)"
          keyboardType="number-pad"
          value={target}
          onChangeText={setTarget}
          accessibilityLabel="Target amount"
        />
        <TextInput
          testID="edit-deadline"
          placeholder="Deadline (YYYY-MM-DD, optional)"
          value={deadline}
          onChangeText={setDeadline}
          accessibilityLabel="Deadline"
        />
        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" compact onPress={onClose} />
          <View style={styles.grow}>
            <Button
              label="Save changes"
              compact
              disabled={!valid}
              onPress={() =>
                onSubmit({
                  name: name.trim(),
                  targetAmount: parsedTarget,
                  deadline: deadline.trim() === '' ? null : deadline.trim(),
                })
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface DeleteProjectModalProps {
  visible: boolean;
  fundedAmount: number;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

/** Confirms a hard delete, warning when the project already holds funds. */
export function DeleteProjectModal({
  visible,
  fundedAmount,
  onClose,
  onConfirm,
}: DeleteProjectModalProps) {
  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={styles.body}>
        <Typography variant="subheading">Delete this project?</Typography>
        <Typography variant="muted">
          {fundedAmount > 0
            ? `It moves to Recently Deleted — its ${formatCurrency(fundedAmount)} stays with it. You can restore it for 3 days before it's removed for good.`
            : "It moves to Recently Deleted. You can restore it for 3 days before it's removed for good."}
        </Typography>
        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" compact onPress={onClose} />
          <View style={styles.grow}>
            <Button
              label="Delete"
              variant="danger"
              compact
              testID="confirm-delete"
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  grow: { flex: 1 },
});
