import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { RADIUS } from '@/constants/layout';
import { ICON_SIZE } from '@/constants/icons';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatSectionDate } from '@/utils/formatDate';

export interface DateFieldProps {
  /** The selected date as an ISO `YYYY-MM-DD` string. */
  value: string;
  /** Receives the newly picked date as an ISO `YYYY-MM-DD` string. */
  onChange: (iso: string) => void;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A tappable date pill that replaces free-text `YYYY-MM-DD` entry. It shows a
 * friendly label ("Today" / "Yesterday" / "Mon 9 Jun") and opens the native
 * date picker on press. Dates are read and written using local calendar
 * components so the day the user taps is the day that gets stored — no UTC
 * drift across the picker boundary.
 */
export function DateField({ value, onChange, accessibilityLabel, testID }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  // `value` can be empty while an edited record is still loading; fall back to a
  // neutral label and today's date for the picker until a real date arrives.
  const isISO = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const label = isISO ? formatSectionDate(value) : 'Select date';

  const now = new Date();
  const [year, month, day] = isISO
    ? value.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const pickerValue = new Date(year, month - 1, day);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === 'dismissed' || !date) return;
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
    onChange(iso);
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `Date: ${label}`}
        testID={testID}
        onPress={() => setOpen(true)}
        style={styles.pill}
      >
        <Icon name="calendar" size={ICON_SIZE.sm} color={c.PRIMARY_GREEN} />
        <Typography style={styles.label}>{label}</Typography>
      </Pressable>

      {open ? (
        <DateTimePicker
          testID="date-picker"
          value={pickerValue}
          mode="date"
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: c.BACKGROUND,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: c.BORDER,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  label: {
    color: c.TEXT_PRIMARY,
  },
});
