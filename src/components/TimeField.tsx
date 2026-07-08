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

export interface TimeFieldProps {
  /** The selected time as a 24-hour `HH:mm` string. */
  value: string;
  /** Receives the newly picked time as a 24-hour `HH:mm` string. */
  onChange: (hhmm: string) => void;
  accessibilityLabel?: string;
  testID?: string;
}

/** Zero-pad a number to two digits (`7` → `"07"`). */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * A tappable time pill that replaces free-text `HH:mm` entry. It shows the
 * selected time and opens the native time picker on press, reading and writing
 * a 24-hour `HH:mm` string. Mirrors {@link DateField}: an empty or malformed
 * value falls back to a neutral label and seeds the picker with the current
 * time until a real value arrives.
 */
export function TimeField({ value, onChange, accessibilityLabel, testID }: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();

  const isHHmm = /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const label = isHHmm ? value : 'Set time';

  const now = new Date();
  const [hours, minutes] = isHHmm
    ? value.split(':').map(Number)
    : [now.getHours(), now.getMinutes()];
  const pickerValue = new Date(2000, 0, 1, hours, minutes);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === 'dismissed' || !date) return;
    onChange(`${pad2(date.getHours())}:${pad2(date.getMinutes())}`);
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `Time: ${label}`}
        testID={testID}
        onPress={() => setOpen(true)}
        style={styles.pill}
      >
        <Icon name="reminder" size={ICON_SIZE.sm} color={c.PRIMARY_GREEN} />
        <Typography style={styles.label}>{label}</Typography>
      </Pressable>

      {open ? (
        <DateTimePicker
          testID="time-picker"
          value={pickerValue}
          mode="time"
          display="spinner"
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
