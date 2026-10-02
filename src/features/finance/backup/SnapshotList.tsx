import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { SectionCard } from '@/components/SectionCard';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatDateLong } from '@/utils/formatDate';

import type { SnapshotInfo, SnapshotReason } from './backup.types';

const REASON_KEYS = {
  daily: 'reasons.daily',
  manual: 'reasons.manual',
  'before-restore': 'reasons.beforeRestore',
} as const satisfies Record<SnapshotReason, string>;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A snapshot's time on this phone's clock, e.g. "2 October 2026, 10:00".
 * The stored time is UTC; the label uses local time, as the user lived it.
 */
export function snapshotTimeLabel(createdAt: string): string {
  const d = new Date(createdAt);
  const localDay = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${formatDateLong(localDay)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface SnapshotListProps {
  snapshots: SnapshotInfo[];
  busy: boolean;
  onCreate: () => void;
  onRestore: (snapshot: SnapshotInfo) => void;
  onDelete: (snapshot: SnapshotInfo) => void;
}

/**
 * The on-phone half of Backup & Restore: "Take a snapshot now" and the
 * snapshots newest first, each with its kind, time, size and Restore/Delete.
 */
export function SnapshotList({ snapshots, busy, onCreate, onRestore, onDelete }: SnapshotListProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('backup');

  return (
    <SectionCard icon="backup" title={t('local.title')} subtitle={t('local.subtitle')}>
      <Button
        testID="backup-snapshot-now"
        label={t('local.backUpNow')}
        variant="secondary"
        onPress={onCreate}
        loading={busy}
      />
      {snapshots.length === 0 ? <Typography variant="muted">{t('local.empty')}</Typography> : null}
      {snapshots.map((s) => (
        <View key={s.id} style={styles.row}>
          <View style={styles.rowText}>
            <Typography>{t(REASON_KEYS[s.reason])}</Typography>
            <Typography variant="muted">{snapshotTimeLabel(s.createdAt)}</Typography>
            <Typography variant="muted">
              {`${t('local.records', { count: s.rowCount })} · ${t('local.sizeKb', {
                size: Math.max(1, Math.round(s.sizeBytes / 1024)),
              })}`}
            </Typography>
          </View>
          <Button
            testID={`backup-snapshot-restore-${s.id}`}
            label={t('local.restore')}
            variant="secondary"
            compact
            disabled={busy}
            onPress={() => onRestore(s)}
          />
          <IconButton
            testID={`backup-snapshot-delete-${s.id}`}
            icon="delete"
            tone="danger"
            accessibilityLabel={t('local.delete')}
            disabled={busy}
            onPress={() => onDelete(s)}
          />
        </View>
      ))}
      <Typography variant="muted">{t('local.note')}</Typography>
    </SectionCard>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopColor: c.BORDER,
    borderTopWidth: 1,
  },
  rowText: { flex: 1, gap: 2 },
});
