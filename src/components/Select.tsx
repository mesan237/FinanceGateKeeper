import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { RADIUS } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export interface SelectOption {
  /** Stable value committed via `onChange`. */
  key: string;
  label: string;
  /** Optional leading glyph, shown on both the trigger and the option row. */
  icon?: IconName;
  /** Optional trailing tag shown on the option row (e.g. "✓ Default"). */
  badge?: string;
}

export interface SelectProps {
  options: SelectOption[];
  /** The key of the currently selected option, or null when none is chosen. */
  value: string | null;
  onChange: (key: string) => void;
  /** Field name — titles the sheet ("Select <title>") and names the trigger. */
  title?: string;
  placeholder?: string;
  testID?: string;
}

/**
 * A single-choice field: a tappable trigger showing the current value that opens
 * a modal list of options; picking a row commits its key and closes. This is the
 * shared version of the trigger+modal-list pattern the account/category pickers
 * grew independently — reach for it whenever a form needs "pick one from a fixed
 * set" and the set is too long or too wordy to sit in a `SegmentedControl`.
 */
export function Select({ options, value, onChange, title, placeholder = 'Select', testID }: SelectProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value) ?? null;

  const choose = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title ? `${title}: ${selected?.label ?? placeholder}` : undefined}
        accessibilityState={{ expanded: open }}
        testID={testID ? `${testID}-trigger` : undefined}
        style={styles.trigger}
        onPress={() => setOpen(true)}
      >
        {selected ? (
          <View style={styles.triggerContent}>
            {selected.icon ? <Icon name={selected.icon} size={ICON_SIZE.sm} /> : null}
            <Typography>{selected.label}</Typography>
          </View>
        ) : (
          <Typography variant="muted">{placeholder}</Typography>
        )}
        <Icon name="dropdown" size={ICON_SIZE.sm} color={c.TEXT_MUTED} />
      </Pressable>

      <Modal visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.header}>
          <Typography variant="subheading">{title ? `Select ${title.toLowerCase()}` : 'Select'}</Typography>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
            <Typography style={styles.action}>Close</Typography>
          </Pressable>
        </View>
        <ScrollView style={styles.list}>
          {options.map((option) => {
            const isSelected = option.key === value;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                testID={testID ? `${testID}-option-${option.key}` : undefined}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => choose(option.key)}
              >
                {option.icon ? (
                  <Icon
                    name={option.icon}
                    size={ICON_SIZE.md}
                    color={isSelected ? c.PRIMARY_GREEN : undefined}
                  />
                ) : null}
                <Typography style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
                  {option.label}
                </Typography>
                {option.badge ? (
                  <Typography
                    testID={testID ? `${testID}-badge-${option.key}` : undefined}
                    style={styles.badge}
                  >
                    {option.badge}
                  </Typography>
                ) : null}
                {isSelected ? <Icon name="check" size={ICON_SIZE.sm} color={c.PRIMARY_GREEN} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.BACKGROUND,
    borderWidth: 1,
    borderColor: c.BORDER,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  triggerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  action: { color: c.PRIMARY_GREEN, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  list: { maxHeight: 320 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.BORDER,
  },
  rowSelected: {
    backgroundColor: c.PRIMARY_LIGHT,
    borderRadius: RADIUS.sm,
    borderBottomColor: 'transparent',
  },
  rowLabel: { flex: 1 },
  rowLabelSelected: { color: c.PRIMARY_GREEN, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  badge: { color: c.PRIMARY_GREEN, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD, fontSize: 12 },
});
