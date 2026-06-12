import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import {
  BACKGROUND,
  BORDER,
  DANGER,
  PRIMARY_GREEN,
  PRIMARY_LIGHT,
  SUCCESS,
  SUCCESS_TEXT,
  SURFACE,
  TEXT_PRIMARY,
  WARNING,
} from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';
import { FUND_TYPE_LABELS } from '@/constants/funds';
import { RADIUS } from '@/constants/layout';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { useFundDetail } from './funds.hooks';
import { getFundProgress } from './funds.service';
import type { FundProgress, FundTransaction } from './funds.types';

/** Semantic fill colour for the progress bar, keyed to how close the fund is. */
function progressColor(pct: number): string {
  if (pct >= 75) return SUCCESS;
  if (pct >= 40) return WARNING;
  return DANGER;
}

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
      <View style={styles.screen}>
        <ScreenHeader title="Fund" />
        <View style={styles.empty}>
          <Typography variant="muted">{loading ? 'Loading…' : 'Fund not found.'}</Typography>
          {error ? <Typography style={styles.error}>{error}</Typography> : null}
        </View>
      </View>
    );
  }

  const progress = getFundProgress(fund);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Fund" />
      <ScrollView contentContainerStyle={styles.content}>
        <FundHero progress={progress} />

        <View style={styles.actions}>
          <View style={styles.actionItem}>
            <Button label="Log withdrawal" onPress={() => setWithdrawOpen(true)} />
          </View>
          <View style={styles.actionItem}>
            <Button label="Edit target" variant="secondary" onPress={() => setTargetOpen(true)} />
          </View>
        </View>

        <Typography variant="label" style={styles.sectionLabel}>
          History
        </Typography>
        {transactions.length === 0 ? (
          <Typography variant="muted">No transactions yet.</Typography>
        ) : (
          <View style={styles.historyCard}>
            {transactions.map((txn, i) => (
              <TransactionRow key={txn.id} txn={txn} first={i === 0} />
            ))}
          </View>
        )}

        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </ScrollView>

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

/**
 * The hero block at the top of the screen: the fund's balance as the focal
 * number, a percentage badge, and a coloured progress bar toward its target.
 * Funds without a target (savings) show the balance and a "no target" note.
 */
function FundHero({ progress }: { progress: FundProgress }) {
  const hasTarget = progress.target !== null && progress.pct !== null;
  return (
    <View style={styles.hero}>
      <Typography variant="label">{FUND_TYPE_LABELS[progress.type]}</Typography>
      <View style={styles.balanceRow}>
        <Typography variant="display">{formatCurrency(progress.current)}</Typography>
        {hasTarget ? (
          <View style={styles.pctBadge}>
            <Typography style={styles.pctBadgeText}>{`${progress.pct}%`}</Typography>
          </View>
        ) : null}
      </View>
      {hasTarget ? (
        <>
          <ProgressBar
            value={progress.pct as number}
            color={progressColor(progress.pct as number)}
            style={styles.heroBar}
            testID="fund-detail-progress"
          />
          <Typography variant="muted">{`Target ${formatCurrency(progress.target as number)}`}</Typography>
        </>
      ) : (
        <Typography variant="muted">No target set</Typography>
      )}
    </View>
  );
}

function TransactionRow({ txn, first }: { txn: FundTransaction; first: boolean }) {
  const isDeposit = txn.direction === 'deposit';
  const sign = isDeposit ? '+' : '−';
  return (
    <View testID={`txn-row-${txn.id}`} style={[styles.row, first && styles.rowFirst]}>
      <View style={styles.rowText}>
        <Typography numberOfLines={1}>
          {txn.reason ?? (isDeposit ? 'Deposit' : 'Withdrawal')}
        </Typography>
        <Typography variant="muted">{formatDateShort(txn.date)}</Typography>
      </View>
      <Typography style={[styles.amount, { color: isDeposit ? SUCCESS_TEXT : TEXT_PRIMARY }]}>
        {`${sign}${formatCurrency(txn.amount)}`}
      </Typography>
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
      <View style={styles.modalBody}>
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
        />
        <View style={styles.modalActions}>
          <View style={styles.actionItem}>
            <Button label="Cancel" variant="secondary" onPress={onClose} />
          </View>
          <View style={styles.actionItem}>
            <Button
              label="Confirm withdrawal"
              disabled={!valid}
              onPress={() => onSubmit(parsed, reason)}
            />
          </View>
        </View>
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
      <View style={styles.modalBody}>
        <Typography variant="subheading">Edit target</Typography>
        <TextInput
          testID="target-amount"
          placeholder="Target (FCFA)"
          keyboardType="number-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <View style={styles.modalActions}>
          <View style={styles.actionItem}>
            <Button label="Cancel" variant="secondary" onPress={onClose} />
          </View>
          <View style={styles.actionItem}>
            <Button
              label="Save target"
              disabled={!valid}
              onPress={() => onSubmit(cleared ? null : parsed)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  empty: {
    padding: 16,
    gap: 12,
  },
  hero: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    gap: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pctBadge: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pctBadgeText: {
    color: PRIMARY_GREEN,
    fontSize: 13,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  heroBar: {
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionItem: {
    flex: 1,
  },
  sectionLabel: {
    marginBottom: -8,
  },
  historyCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  amount: {
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  modalBody: {
    gap: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  error: {
    color: DANGER,
  },
});
