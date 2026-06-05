import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ProgressBar';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';
import { PROJECT_STATUS_LABELS } from '@/constants/projects';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { useProjectDetail } from './projects.hooks';
import type { ProjectTransaction } from './projects.types';

export interface ProjectDetailProps {
  /** The project's row id, supplied by the route. */
  projectId: number;
}

/**
 * One project's detail: progress toward its target, contribution history, and
 * controls to pause/resume funding and add a manual contribution. Editing the
 * name/target and drag-reordering priority are deferred (the service supports
 * them; the UI lands in a later polish slice).
 */
export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const { project, transactions, loading, error, setStatus, contribute } =
    useProjectDetail(projectId);
  const [addOpen, setAddOpen] = useState(false);

  if (!project) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">{loading ? 'Loading…' : 'Project not found.'}</Typography>
        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </View>
    );
  }

  const pct = Math.round((project.fundedAmount / project.targetAmount) * 100);
  const paused = project.status === 'paused';

  return (
    <View style={styles.container}>
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

      <AddFundsModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={async (amount) => {
          await contribute(amount);
          setAddOpen(false);
        }}
      />
    </View>
  );
}

function TransactionRow({ txn }: { txn: ProjectTransaction }) {
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
  onSubmit: (amount: number) => void | Promise<void>;
}

function AddFundsModal({ visible, onClose, onSubmit }: AddFundsModalProps) {
  const [amount, setAmount] = useState('');
  const parsed = Number(amount);
  const valid = Number.isInteger(parsed) && parsed > 0;

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <Typography variant="subheading">Add funds</Typography>
      <TextInput
        testID="contribution-amount"
        placeholder="Amount (FCFA)"
        keyboardType="number-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <View style={styles.actions}>
        <Button label="Cancel" onPress={onClose} />
        <Button label="Confirm contribution" disabled={!valid} onPress={() => onSubmit(parsed)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  error: {
    color: DANGER,
  },
});
