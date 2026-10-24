import { DrawerContentScrollView, type DrawerContentComponentProps } from '@react-navigation/drawer';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AttentionDot, attentionHint } from '@/components/AttentionDot';
import { useAttention } from '@/components/AttentionProvider';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ATTENTION_PLANNED, ATTENTION_TONTINES } from '@/constants/attention';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import type { navigation } from '@/i18n/locales/en/navigation';
import { useThemedStyles, type ThemeColors } from '@/theme';

/** Where "Feedback" opens a pre-addressed email for this single-user app. */
const FEEDBACK_EMAIL = 'abdielkouam@gmail.com';

type DrawerKey = keyof (typeof navigation)['drawer'];

interface DrawerRow {
  labelKey: DrawerKey;
  icon: IconName;
  /** Stack route to navigate to. Mutually exclusive with `onPress`. */
  route?: string;
  /** Custom handler (e.g. open mailto). Mutually exclusive with `route`. */
  onPress?: () => void;
  /** `AttentionProvider` section whose counts light this row's dot. */
  attentionKey?: string;
}

interface DrawerSection {
  titleKey: DrawerKey;
  rows: DrawerRow[];
}

// Two groups (UX-18): the user's money objects, then the app itself. Only
// screens that exist are listed — a disabled "soon" row reads as unfinished.
const SECTIONS: DrawerSection[] = [
  {
    titleKey: 'myMoney',
    rows: [
      { labelKey: 'accounts', icon: 'wallet', route: '/accounts' },
      { labelKey: 'goals', icon: 'goal', route: '/goals' },
      { labelKey: 'debts', icon: 'debt', route: '/debt' },
      { labelKey: 'tontines', icon: 'tontine', route: '/tontines', attentionKey: ATTENTION_TONTINES },
      { labelKey: 'planned', icon: 'planned', route: '/planned', attentionKey: ATTENTION_PLANNED },
      { labelKey: 'events', icon: 'event', route: '/events' },
    ],
  },
  {
    titleKey: 'app',
    rows: [
      { labelKey: 'categories', icon: 'categories', route: '/expenses/categories' },
      { labelKey: 'preferences', icon: 'settings', route: '/settings' },
      { labelKey: 'backupRestore', icon: 'backup', route: '/backup' },
      { labelKey: 'exportImport', icon: 'export', route: '/data-transfer' },
      {
        labelKey: 'feedback',
        icon: 'feedback',
        onPress: () => void Linking.openURL(`mailto:${FEEDBACK_EMAIL}`),
      },
    ],
  },
];

/**
 * Custom content for the app's left navigation drawer: a branded header, then
 * the user's money (wallets, goals, debts, tontines, planned purchases, events)
 * and the app (categories, preferences, backup, export, feedback). Pressing a
 * row closes the drawer and pushes its stack route (or runs its handler).
 */
export function AppDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('navigation');
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const handlePress = (row: DrawerRow) => {
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

      {SECTIONS.map((section) => (
        <View key={section.titleKey} style={styles.section}>
          <Typography variant="label" style={styles.sectionTitle}>
            {t(`drawer.${section.titleKey}`)}
          </Typography>
          {section.rows.map((row) => (
            <DrawerItem
              key={row.labelKey}
              row={row}
              label={t(`drawer.${row.labelKey}`)}
              onPress={() => handlePress(row)}
              styles={styles}
            />
          ))}
        </View>
      ))}
    </DrawerContentScrollView>
  );
}

function DrawerItem({
  row,
  label,
  onPress,
  styles,
}: {
  row: DrawerRow;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  // Reads '' for rows without a key, which nothing publishes under.
  const attention = useAttention(row.attentionKey ?? '');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={attentionHint(attention)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <Icon name={row.icon} size={ICON_SIZE.md} />
      <Typography style={styles.rowLabel}>{label}</Typography>
      <AttentionDot counts={attention} testID={`drawer-dot-${row.attentionKey}`} />
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
});
