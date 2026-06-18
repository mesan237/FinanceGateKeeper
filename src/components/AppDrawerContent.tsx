import { DrawerContentScrollView, type DrawerContentComponentProps } from '@react-navigation/drawer';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { useThemedStyles, type ThemeColors } from '@/theme';

/** Where "Feedback" opens a pre-addressed email for this single-user app. */
const FEEDBACK_EMAIL = 'abdielkouam@gmail.com';

interface DrawerRow {
  label: string;
  icon: IconName;
  /** Stack route to navigate to. Mutually exclusive with `onPress`/`soon`. */
  route?: string;
  /** Custom handler (e.g. open mailto). Mutually exclusive with `route`/`soon`. */
  onPress?: () => void;
  /** Marks a planned destination that has no screen yet — rendered disabled. */
  soon?: boolean;
}

interface DrawerSection {
  title?: string;
  rows: DrawerRow[];
}

// The full intended menu. Rows with a `route` navigate to an existing screen;
// `soon` rows are placeholders for screens not yet built (Export, Backup,
// Delete & Reset, Help) and render disabled so navigation never dead-ends.
const SECTIONS: DrawerSection[] = [
  { rows: [{ label: 'Preferences', icon: 'settings', route: '/settings' }] },
  {
    title: 'Management',
    rows: [
      { label: 'Accounts', icon: 'wallet', route: '/accounts' },
      { label: 'Categories', icon: 'categories', route: '/expenses/categories' },
      { label: 'Export records', icon: 'export', soon: true },
      { label: 'Backup & Restore', icon: 'backup', soon: true },
      { label: 'Delete & Reset', icon: 'delete', soon: true },
    ],
  },
  {
    title: 'Application',
    rows: [
      { label: 'Help', icon: 'help', soon: true },
      {
        label: 'Feedback',
        icon: 'feedback',
        onPress: () => void Linking.openURL(`mailto:${FEEDBACK_EMAIL}`),
      },
    ],
  },
];

/**
 * Custom content for the app's left navigation drawer. Renders a branded header
 * plus grouped links to settings, data management, and app meta. Pressing a row
 * closes the drawer and pushes its stack route (or runs its handler); disabled
 * "soon" rows are inert placeholders for screens not yet built.
 */
export function AppDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const handlePress = (row: DrawerRow) => {
    if (row.soon) return;
    props.navigation.closeDrawer();
    if (row.route) {
      router.push(row.route as never);
    } else if (row.onPress) {
      row.onPress();
    }
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Typography variant="heading">Finance Gatekeeper</Typography>
        <Typography variant="muted">v{version}</Typography>
      </View>

      {SECTIONS.map((section, i) => (
        <View key={section.title ?? `section-${i}`} style={styles.section}>
          {section.title ? (
            <Typography variant="label" style={styles.sectionTitle}>
              {section.title}
            </Typography>
          ) : null}
          {section.rows.map((row) => (
            <DrawerItem key={row.label} row={row} onPress={() => handlePress(row)} styles={styles} />
          ))}
        </View>
      ))}
    </DrawerContentScrollView>
  );
}

function DrawerItem({
  row,
  onPress,
  styles,
}: {
  row: DrawerRow;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.label}
      accessibilityState={{ disabled: !!row.soon }}
      disabled={row.soon}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && !row.soon ? styles.rowPressed : null]}
    >
      <Icon name={row.icon} size={ICON_SIZE.md} />
      <Typography style={row.soon ? styles.rowLabelDisabled : styles.rowLabel}>{row.label}</Typography>
      {row.soon ? (
        <Typography variant="label" style={styles.soonTag}>
          Soon
        </Typography>
      ) : null}
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  content: {
    paddingTop: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomColor: c.BORDER,
    borderBottomWidth: 1,
    gap: 2,
  },
  section: {
    paddingVertical: 8,
    borderBottomColor: c.BORDER,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: c.SURFACE_MUTED,
  },
  rowLabel: {
    flex: 1,
    color: c.TEXT_PRIMARY,
  },
  rowLabelDisabled: {
    flex: 1,
    color: c.TEXT_MUTED,
  },
  soonTag: {
    color: c.TEXT_MUTED,
  },
});
