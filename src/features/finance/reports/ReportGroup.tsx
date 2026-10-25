import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ICON_SIZE } from '@/constants/icons';
import { SPACING } from '@/constants/layout';
import { useRememberedToggle } from '@/hooks/useRememberedToggle';
import { useTheme } from '@/theme';

export interface ReportGroupProps {
  /** Used for test ids: `report-group-<id>`. */
  id: string;
  title: string;
  hint?: string;
  /**
   * Makes the group fold, remembering the user's choice under `prefKey`
   * (UX-14). `defaultOpen` applies until the user chooses, so it can follow
   * the journey step. Omitted, the group is always open.
   */
  collapsible?: { prefKey: string; defaultOpen: boolean };
  children: React.ReactNode;
}

/** A Reports group's heading and its sections (UX-14). */
export function ReportGroup({ id, title, hint, collapsible, children }: ReportGroupProps) {
  if (!collapsible) {
    return (
      <View style={styles.group} testID={`report-group-${id}`}>
        <Heading title={title} hint={hint} />
        {children}
      </View>
    );
  }
  return (
    <FoldingGroup id={id} title={title} hint={hint} prefKey={collapsible.prefKey} defaultOpen={collapsible.defaultOpen}>
      {children}
    </FoldingGroup>
  );
}

interface FoldingGroupProps {
  id: string;
  title: string;
  hint?: string;
  prefKey: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}

/** A group whose heading opens and closes it, with the choice remembered on the phone. */
function FoldingGroup({ id, title, hint, prefKey, defaultOpen, children }: FoldingGroupProps) {
  const c = useTheme();
  const { t } = useTranslation('reports');
  const { open, toggle } = useRememberedToggle(prefKey, defaultOpen);

  return (
    <View style={styles.group} testID={`report-group-${id}`}>
      <Pressable
        testID={`report-group-${id}-toggle`}
        accessibilityRole="button"
        accessibilityLabel={t('groups.toggleA11y', { group: title })}
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={styles.toggle}
      >
        <View style={styles.grow}>
          <Heading title={title} hint={hint} />
        </View>
        <Icon name={open ? 'moveUp' : 'dropdown'} size={ICON_SIZE.md} color={c.TEXT_MUTED} />
      </Pressable>
      {open ? children : null}
    </View>
  );
}

/** The group's eyebrow title and its one-line meaning. */
function Heading({ title, hint }: { title: string; hint?: string }) {
  return (
    <View>
      <Typography variant="label">{title}</Typography>
      {hint ? <Typography variant="muted">{hint}</Typography> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: SPACING.md },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  grow: { flex: 1 },
});
