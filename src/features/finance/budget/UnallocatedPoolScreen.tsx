import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { BORDER, DANGER, TEXT_MUTED } from '@/constants/colors';
import { getTransactionIcon } from '@/constants/categoryIcons';
import { labelForSource } from '@/constants/incomeSources';
import type { Fund } from '@/features/finance/funds/funds.types';
import type { Income } from '@/features/finance/income/income.types';
import type { Project } from '@/features/finance/projects/projects.types';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { useUnallocatedPool } from './budget.hooks';
import type { AllocationDestination } from './budget.types';

const FUND_LABELS: Record<Fund['type'], string> = {
  emergency: 'Emergency fund',
  savings: 'Savings',
};

/**
 * The unallocated-income pool (VS-19). Lists every held (pending) income and
 * lets the user send each one, in full, to a destination of their choice — the
 * expense budget, a fund, or an active project. Confirming a destination
 * deposits (where applicable) and flips the income to `allocated`, so it leaves
 * the pool and — for the expense destination — starts counting toward the
 * month's spendable budget.
 */
export function UnallocatedPoolScreen() {
  const { pending, total, funds, projects, loading, error, allocate } = useUnallocatedPool();
  const [selected, setSelected] = useState<Income | null>(null);

  const handlePick = async (destination: AllocationDestination) => {
    if (!selected) return;
    const income = selected;
    setSelected(null);
    await allocate(income, destination);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Unallocated income" />

      <Card>
        <Typography variant="label">Held, waiting for you to decide</Typography>
        <Typography variant="display">{formatCurrency(total)}</Typography>
      </Card>

      {loading ? (
        <Typography variant="muted">Loading…</Typography>
      ) : pending.length === 0 ? (
        <Typography variant="muted">
          Nothing held right now. Income you choose to hold on the allocation
          screen will appear here.
        </Typography>
      ) : (
        <Card>
          {pending.map((income, index) => (
            <PendingRow
              key={income.id}
              income={income}
              first={index === 0}
              onPress={() => setSelected(income)}
            />
          ))}
        </Card>
      )}

      {error ? <Typography style={styles.error}>{error}</Typography> : null}

      <BottomSheet visible={selected !== null} onClose={() => setSelected(null)}>
        {selected ? (
          <DestinationPicker
            income={selected}
            funds={funds}
            projects={projects}
            onPick={handlePick}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}

interface PendingRowProps {
  income: Income;
  first: boolean;
  onPress: () => void;
}

function PendingRow({ income, first, onPress }: PendingRowProps) {
  const icon = getTransactionIcon('income', undefined, income.source);
  return (
    <Pressable
      testID={`pending-row-${income.id}`}
      onPress={onPress}
      style={[styles.row, first && styles.rowFirst]}
    >
      <Typography style={styles.rowIcon}>{icon ?? '•'}</Typography>
      <View style={styles.rowBody}>
        <Typography>{labelForSource(income.source)}</Typography>
        <Typography variant="muted">{formatDateShort(income.date)}</Typography>
      </View>
      <Typography variant="subheading">{formatCurrency(income.amount)}</Typography>
    </Pressable>
  );
}

interface DestinationPickerProps {
  income: Income;
  funds: Fund[];
  projects: Project[];
  onPick: (destination: AllocationDestination) => void;
}

function DestinationPicker({ income, funds, projects, onPick }: DestinationPickerProps) {
  return (
    <View style={styles.picker}>
      <Typography variant="subheading">
        Send {formatCurrency(income.amount)} to…
      </Typography>

      <Button label="Expense budget" onPress={() => onPick({ kind: 'expense' })} />

      {funds.map((fund) => (
        <Button
          key={fund.id}
          label={FUND_LABELS[fund.type]}
          variant="secondary"
          onPress={() => onPick({ kind: 'fund', fundType: fund.type })}
        />
      ))}

      {projects.map((project) => (
        <Button
          key={project.id}
          label={project.name}
          variant="secondary"
          onPress={() => onPick({ kind: 'project', projectId: project.id })}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  rowFirst: {
    borderTopWidth: 0,
    marginTop: 0,
    paddingTop: 0,
  },
  rowIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
    color: TEXT_MUTED,
  },
  rowBody: {
    flex: 1,
  },
  picker: {
    gap: 10,
  },
  error: {
    color: DANGER,
  },
});
