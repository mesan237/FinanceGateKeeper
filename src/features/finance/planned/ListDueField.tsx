import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { DateField } from '@/components/DateField';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { DueBadge } from './DueBadge';

export interface ListDueFieldProps {
  /** The list's shopping day, or null for a list made before due dates. */
  dueDate: string | null;
  /** Saves a newly picked day for the whole list. */
  onChange: (dueDate: string) => void;
  /** Whether anything is still to buy — a finished list shows no countdown. */
  hasOpenItems: boolean;
}

/**
 * The list's shopping day at the top of a list: the date (tap to move it) and
 * how close it is. An undated list asks for a day, since that is what the
 * reminders count down to.
 */
export function ListDueField({ dueDate, onChange, hasOpenItems }: ListDueFieldProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('planned');

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Typography variant="muted">{t('list.dueLabel')}</Typography>
        {dueDate !== null && hasOpenItems ? <DueBadge dateISO={dueDate} /> : null}
      </View>
      <DateField
        testID="planned-list-due"
        value={dueDate ?? ''}
        onChange={onChange}
        accessibilityLabel={t('list.dueLabel')}
      />
      {dueDate === null ? (
        <Typography style={styles.missing}>{t('list.dueMissing')}</Typography>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    missing: { color: c.WARNING_TEXT },
  });
