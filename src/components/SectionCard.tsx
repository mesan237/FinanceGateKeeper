import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { RADIUS } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export interface SectionCardProps {
  /** Leading badge glyph from the chrome registry. */
  icon: IconName;
  title: string;
  /** Optional one-line description under the title. */
  subtitle?: string;
  /** Trailing control aligned with the title row (e.g. a switch or value pill). */
  right?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * A grouped settings/management card: a tinted icon badge, a title/subtitle
 * header with an optional trailing control, and the section's body beneath it.
 * Shared so settings-style screens render identical section chrome.
 */
export function SectionCard({ icon, title, subtitle, right, children }: SectionCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Icon name={icon} size={ICON_SIZE.md} color={c.PRIMARY_GREEN} />
        </View>
        <View style={styles.headerText}>
          <Typography variant="subheading">{title}</Typography>
          {subtitle ? <Typography variant="muted">{subtitle}</Typography> : null}
        </View>
        {right ?? null}
      </View>
      {children ? <View style={styles.body}>{children}</View> : null}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: c.PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  body: {
    gap: 10,
  },
});
