import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Typography } from '@/components/Typography';

import type { PlannedItem } from './planned.types';

export interface PostponeSheetProps {
  /** The item being postponed, or null when the sheet is closed. */
  item: PlannedItem | null;
  onClose: () => void;
  /** Pushes the item back by `days`; resolves `true` on success. */
  onPostpone: (item: PlannedItem, days: number) => Promise<boolean>;
  /** Moves the item to an exact day; resolves `true` on success. */
  onPickDate: (item: PlannedItem, dateISO: string) => Promise<boolean>;
}

/**
 * Quick ways to push an item back: one day, one week, or a picked date. The new
 * date becomes the item's own, so the rest of the list keeps its shopping day.
 */
export function PostponeSheet({ item, onClose, onPostpone, onPickDate }: PostponeSheetProps) {
  const { t } = useTranslation('planned');
  // Keep the last item while the sheet slides away, so its title does not blank.
  const lastItem = useRef<PlannedItem | null>(item);
  if (item) lastItem.current = item;
  const shown = item ?? lastItem.current;

  const run = async (work: (target: PlannedItem) => Promise<boolean>) => {
    if (!shown) return;
    if (await work(shown)) onClose();
  };

  return (
    <BottomSheet visible={item !== null} onClose={onClose} testID="postpone-sheet">
      <View style={styles.container}>
        <Typography variant="subheading">
          {t('postpone.title', { name: shown?.name ?? '' })}
        </Typography>
        <Button
          testID="postpone-day"
          variant="secondary"
          label={t('postpone.oneDay')}
          onPress={() => void run((target) => onPostpone(target, 1))}
        />
        <Button
          testID="postpone-week"
          variant="secondary"
          label={t('postpone.oneWeek')}
          onPress={() => void run((target) => onPostpone(target, 7))}
        />
        <Typography variant="muted">{t('postpone.pick')}</Typography>
        <DateField
          testID="postpone-date"
          value=""
          onChange={(iso) => void run((target) => onPickDate(target, iso))}
          accessibilityLabel={t('postpone.pick')}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
});
