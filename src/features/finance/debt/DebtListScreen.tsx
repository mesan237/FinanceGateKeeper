import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { DEBT_STATUS_LABELS, type DebtDirection } from '@/constants/debt';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { useDebts } from './debt.hooks';
import type { Debt } from './debt.types';

/**
 * The people ledger: a Lent / Owed tab switch, the outstanding total for the
 * active direction, and the list of debts. "Add debt" opens the create form;
 * tapping a row opens its detail. Reached from the Transactions screen (debt is
 * not a bottom tab).
 */
export function DebtListScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [direction, setDirection] = useState<DebtDirection>('lent');
  const { debts, totals, loading, error } = useDebts(direction);

  return (
    <View style={styles.container}>
      <Typography variant="heading">Debts</Typography>

      <View style={styles.tabs}>
        <View style={styles.grow}>
          <Button testID="debt-tab-lent" label="Lent" onPress={() => setDirection('lent')} />
        </View>
        <View style={styles.grow}>
          <Button testID="debt-tab-owed" label="Owed" onPress={() => setDirection('owed')} />
        </View>
      </View>

      <Typography variant="muted">{`Outstanding: ${formatCurrency(totals[direction])}`}</Typography>

      {loading ? (
        <Typography variant="muted">Loading…</Typography>
      ) : debts.length === 0 ? (
        <Typography variant="muted">No debts here yet.</Typography>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {debts.map((debt) => (
            <DebtRow key={debt.id} debt={debt} onPress={() => router.push(`/debt/${debt.id}`)} />
          ))}
        </ScrollView>
      )}

      <Button label="Add debt" onPress={() => router.push('/debt/create')} />

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </View>
  );
}

interface DebtRowProps {
  debt: Debt;
  onPress: () => void;
}

function DebtRow({ debt, onPress }: DebtRowProps) {
  const styles = useThemedStyles(makeStyles);
  const settled = debt.status === 'settled';
  return (
    <Pressable testID={`debt-row-${debt.id}`} onPress={onPress}>
      <Card style={settled ? styles.settledCard : undefined}>
        <View style={styles.rowHeader}>
          <Typography variant="subheading">{debt.personName}</Typography>
          <Typography variant="muted">{DEBT_STATUS_LABELS[debt.status]}</Typography>
        </View>
        <Typography>{formatCurrency(debt.amount)}</Typography>
        {debt.dueDate ? (
          <Typography variant="muted" style={styles.due}>
            {`Due ${formatDateShort(debt.dueDate)}`}
          </Typography>
        ) : null}
      </Card>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  grow: {
    flex: 1,
  },
  list: {
    gap: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  due: {
    color: c.TEXT_MUTED,
    marginTop: 4,
  },
  settledCard: {
    opacity: 0.6,
  },
  error: {
    color: c.DANGER,
  },
});
