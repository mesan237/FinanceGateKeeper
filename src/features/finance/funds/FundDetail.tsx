import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';
import { FUND_TYPE_LABELS } from '@/constants/funds';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { FundProgressBar } from './FundProgressBar';
import { useFundDetail } from './funds.hooks';
import { getFundProgress } from './funds.service';
import type { FundTransaction } from './funds.types';

export interface FundDetailProps {
  /** The fund's row id, supplied by the route. */
  fundId: number;
}

/**
 * One fund's detail: progress toward its target, full transaction history, and
 * controls to log a manual withdrawal and edit the target. Deposits are not
 * entered here — they flow automatically from the allocation confirm step.
 */
export function FundDetail({ fundId }: FundDetailProps) {
  const { fund, transactions, loading, error, withdraw, setTarget } = useFundDetail(fundId);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);

  if (!fund) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">{loading ? 'Loading…' : 'Fund not found.'}</Typography>
        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Typography variant="heading">{FUND_TYPE_LABELS[fund.type]}</Typography>
      <FundProgressBar progress={getFundProgress(fund)} testID="fund-detail-progress" />

      <View style={styles.actions}>
        <Button label="Log withdrawal" onPress={() => setWithdrawOpen(true)} />
        <Button label="Edit target" onPress={() => setTargetOpen(true)} />
      </View>

      <Typography variant="subheading">History</Typography>
      {transactions.length === 0 ? (
        <Typography variant="muted">No transactions yet.</Typography>
      ) : (
        transactions.map((txn) => <TransactionRow key={txn.id} txn={txn} />)
      )}

      {error ? <Typography style={styles.error}>{error}</Typography> : null}

      <WithdrawModal
        visible={withdrawOpen}
        max={fund.currentAmount}
        onClose={() => setWithdrawOpen(false)}
        onSubmit={async (amount, reason) => {
          await withdraw(amount, reason);
          setWithdrawOpen(false);
        }}
      />
      <TargetModal
        visible={targetOpen}
        current={fund.targetAmount}
        canClear={fund.type === 'savings'}
        onClose={() => setTargetOpen(false)}
        onSubmit={async (target) => {
          await setTarget(target);
          setTargetOpen(false);
        }}
      />
    </View>
  );
}

function TransactionRow({ txn }: { txn: FundTransaction }) {
  const sign = txn.direction === 'deposit' ? '+' : '−';
  return (
    <View testID={`txn-row-${txn.id}`} style={styles.row}>
      <View>
        <Typography>{txn.reason ?? (txn.direction === 'deposit' ? 'Deposit' : 'Withdrawal')}</Typography>
        <Typography variant="muted">{formatDateShort(txn.date)}</Typography>
      </View>
      <Typography>{`${sign}${formatCurrency(txn.amount)}`}</Typography>
    </View>
  );
}

interface WithdrawModalProps {
  visible: boolean;
  max: number;
  onClose: () => void;
  onSubmit: (amount: number, reason: string) => void | Promise<void>;
}

function WithdrawModal({ visible, max, onClose, onSubmit }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const parsed = Number(amount);
  const valid = Number.isInteger(parsed) && parsed > 0 && parsed <= max;

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <Typography variant="subheading">Log withdrawal</Typography>
      <TextInput
        testID="withdraw-amount"
        placeholder="Amount (FCFA)"
        keyboardType="number-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <TextInput
        testID="withdraw-reason"
        placeholder="Reason"
        value={reason}
        onChangeText={setReason}
        style={styles.spaced}
      />
      <View style={styles.actions}>
        <Button label="Cancel" onPress={onClose} />
        <Button
          label="Confirm withdrawal"
          disabled={!valid}
          onPress={() => onSubmit(parsed, reason)}
        />
      </View>
    </Modal>
  );
}

interface TargetModalProps {
  visible: boolean;
  current: number | null;
  canClear: boolean;
  onClose: () => void;
  onSubmit: (target: number | null) => void | Promise<void>;
}

function TargetModal({ visible, current, canClear, onClose, onSubmit }: TargetModalProps) {
  const [amount, setAmount] = useState(current === null ? '' : String(current));
  const parsed = Number(amount);
  const cleared = amount.trim() === '';
  const valid = cleared ? canClear : Number.isInteger(parsed) && parsed > 0;

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <Typography variant="subheading">Edit target</Typography>
      <TextInput
        testID="target-amount"
        placeholder="Target (FCFA)"
        keyboardType="number-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <View style={styles.actions}>
        <Button label="Cancel" onPress={onClose} />
        <Button
          label="Save target"
          disabled={!valid}
          onPress={() => onSubmit(cleared ? null : parsed)}
        />
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
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  spaced: {
    marginTop: 8,
  },
  error: {
    color: DANGER,
  },
});
