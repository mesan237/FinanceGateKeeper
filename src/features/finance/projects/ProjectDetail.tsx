import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { PROJECT_STATUS_LABELS } from '@/constants/projects';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { useDefaultAccountId } from '@/features/finance/accounts/accounts.hooks';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { DeleteProjectModal, EditProjectModal } from './ProjectEditModals';
import { useProjectDetail } from './projects.hooks';
import type { ProjectTransaction } from './projects.types';

export interface ProjectDetailProps {
  /** The project's row id, supplied by the route. */
  projectId: number;
}

/**
 * One project's detail: progress toward its target, contribution history, and
 * controls to pause/resume funding, add a manual contribution, edit the
 * name/target/deadline, or delete the project (with a funded-aware
 * confirmation). Drag-reordering priority is still deferred.
 */
export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { project, transactions, loading, error, setStatus, contribute, update, remove } =
    useProjectDetail(projectId);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!project) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">{loading ? 'Loading…' : 'Project not found.'}</Typography>
        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </View>
    );
  }

  const pct = Math.min(100, Math.round((project.fundedAmount / project.targetAmount) * 100));
  const paused = project.status === 'paused';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Project"
        rightAction={
          <IconButton
            icon="edit"
            accessibilityLabel="Edit project"
            testID="edit-project"
            tone="primary"
            onPress={() => setEditOpen(true)}
          />
        }
      />
      <View style={styles.rowHeader}>
        <Typography variant="heading">{project.name}</Typography>
        <Typography variant="muted">{PROJECT_STATUS_LABELS[project.status]}</Typography>
      </View>

      <Typography variant="muted">
        {`${formatCurrency(project.fundedAmount)} / ${formatCurrency(project.targetAmount)}`}
      </Typography>
      <ProgressBar value={pct} testID="project-detail-progress" />

      <View style={styles.actions}>
        <Button label="Add funds" onPress={() => setAddOpen(true)} />
        {project.status !== 'completed' ? (
          <Button
            label={paused ? 'Resume' : 'Pause'}
            onPress={() => setStatus(paused ? 'active' : 'paused')}
          />
        ) : null}
      </View>

      <Typography variant="subheading">History</Typography>
      {transactions.length === 0 ? (
        <Typography variant="muted">No contributions yet.</Typography>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {transactions.map((txn) => (
            <TransactionRow key={txn.id} txn={txn} />
          ))}
        </ScrollView>
      )}

      {error ? <Typography style={styles.error}>{error}</Typography> : null}

      <Button
        label="Delete project"
        variant="danger"
        testID="delete-project"
        onPress={() => setDeleteOpen(true)}
      />

      <AddFundsModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={async (amount, accountId) => {
          await contribute(amount, accountId);
          setAddOpen(false);
        }}
      />

      <EditProjectModal
        visible={editOpen}
        project={project}
        onClose={() => setEditOpen(false)}
        onSubmit={async (patch) => {
          const ok = await update(patch);
          if (ok) setEditOpen(false);
        }}
      />

      <DeleteProjectModal
        visible={deleteOpen}
        fundedAmount={project.fundedAmount}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          const ok = await remove();
          setDeleteOpen(false);
          if (ok) router.replace('/(tabs)/projects');
        }}
      />
    </View>
  );
}

function TransactionRow({ txn }: { txn: ProjectTransaction }) {
  const styles = useThemedStyles(makeStyles);
  const label =
    txn.source === 'allocation' ? `Allocation ${txn.date.slice(0, 7)}` : 'Manual contribution';
  return (
    <View testID={`project-txn-${txn.id}`} style={styles.row}>
      <View>
        <Typography>{label}</Typography>
        <Typography variant="muted">{formatDateShort(txn.date)}</Typography>
      </View>
      <Typography>{`+${formatCurrency(txn.amount)}`}</Typography>
    </View>
  );
}

interface AddFundsModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amount: number, accountId: number | null) => void | Promise<void>;
}

function AddFundsModal({ visible, onClose, onSubmit }: AddFundsModalProps) {
  const styles = useThemedStyles(makeStyles);
  const defaultAccountId = useDefaultAccountId();
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const parsed = Number(amount);
  const valid = Number.isInteger(parsed) && parsed > 0;

  useEffect(() => {
    if (accountId === null && defaultAccountId !== null) setAccountId(defaultAccountId);
  }, [defaultAccountId, accountId]);

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBody}>
        <Typography variant="subheading">Add funds</Typography>
        <TextInput
          testID="contribution-amount"
          placeholder="Amount (FCFA)"
          keyboardType="number-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <AccountPicker
          testID="contribution-account"
          label="From which account?"
          value={accountId}
          onChange={setAccountId}
        />
        <View style={styles.modalActions}>
          <Button label="Cancel" variant="secondary" compact onPress={onClose} />
          <View style={styles.grow}>
            <Button
              label="Confirm contribution"
              compact
              disabled={!valid}
              onPress={() => onSubmit(parsed, accountId)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBody: {
    gap: 14,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  grow: {
    flex: 1,
  },
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.BORDER,
  },
  error: {
    color: c.DANGER,
  },
});
