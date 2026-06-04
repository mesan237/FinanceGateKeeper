import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';
import { labelForSource } from '@/constants/incomeSources';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { IncomeSourcePicker } from './IncomeSourcePicker';
import { useIncomeHistory, useIncomeLog } from './income.hooks';

const RECENT_LIMIT = 10;

/**
 * Income entry form (amount, source pills, optional note, date defaulting to
 * today) over an inline recent-income list (last 10 entries). On a successful
 * save the form clears and the list refreshes; the user stays on the screen to
 * log further entries. No allocation navigation yet — that arrives in VS-06.
 */
export function IncomeLogScreen() {
  const log = useIncomeLog();
  const history = useIncomeHistory();

  const handleSave = async () => {
    const id = await log.submit();
    if (id !== null) {
      await history.refresh();
    }
  };

  const recent = history.income.slice(0, RECENT_LIMIT);

  return (
    <View style={styles.container}>
      <Typography variant="heading">Log Income</Typography>

      <TextInput
        value={log.amount}
        onChangeText={log.setAmount}
        placeholder="Amount (FCFA)"
        keyboardType="numeric"
        accessibilityLabel="Amount"
      />

      <IncomeSourcePicker value={log.source} onChange={log.setSource} />

      <TextInput
        value={log.note}
        onChangeText={log.setNote}
        placeholder="Note (optional)"
        accessibilityLabel="Note"
      />

      <TextInput
        value={log.date}
        onChangeText={log.setDate}
        placeholder="YYYY-MM-DD"
        accessibilityLabel="Date"
      />

      <Button label="Save" onPress={handleSave} disabled={!log.canSubmit} />

      {log.error ? <Typography style={styles.error}>{log.error}</Typography> : null}

      <Typography variant="subheading" style={styles.recentHeading}>
        Recent income
      </Typography>

      {recent.length === 0 ? (
        <Typography variant="muted">No income logged yet.</Typography>
      ) : (
        <FlatList
          data={recent}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Typography>{formatCurrency(item.amount)}</Typography>
              <Typography variant="muted">
                {`${labelForSource(item.source)} · ${formatDateShort(item.date)}`}
              </Typography>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  error: {
    color: DANGER,
  },
  recentHeading: {
    marginTop: 8,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    gap: 2,
  },
});
