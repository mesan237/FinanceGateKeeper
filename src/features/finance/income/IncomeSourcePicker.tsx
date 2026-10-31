import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { labelForIncomeSource } from '@/constants/incomeSources';
import { RADIUS } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import type { IncomeSource } from './income.types';
import { IncomeSourceFormModal } from './IncomeSourceFormModal';
import { useIncomeSources } from './incomeSources.hooks';

export interface IncomeSourcePickerProps {
  /** The picked source id (top-level or subsource), or null. */
  value: number | null;
  onChange: (sourceId: number) => void;
}

interface PillProps {
  label: string;
  active?: boolean;
  dashed?: boolean;
  onPress: () => void;
}

function Pill({ label, active = false, dashed = false, onPress }: PillProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive, dashed && styles.pillDashed]}
    >
      <Typography style={active ? styles.pillTextActive : undefined}>{label}</Typography>
    </Pressable>
  );
}

/**
 * Picks where income comes from (VS-91). One pill per visible top-level source,
 * then — once one is picked — its subsources (optional; tapping the picked one
 * goes back to its source). "New source" / "Add under …" create a source of the
 * user's own and select it. A hidden source still shows while the entry uses
 * it. Gift & family support carries a line on what counts as income.
 */
export function IncomeSourcePicker({ value, onChange }: IncomeSourcePickerProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const { t } = useTranslation('income');
  const { topLevel, subsourcesOf, byId, create, error, clearError } = useIncomeSources();
  // The parent of the source being added: `null` for a top-level one; no form when undefined.
  const [addingUnder, setAddingUnder] = useState<IncomeSource | null | undefined>(undefined);

  const picked = value === null ? null : byId(value);
  const pickedTop = picked?.parentId != null ? byId(picked.parentId) : picked;
  const shown = (s: IncomeSource) => !s.isHidden || s.id === value || s.id === pickedTop?.id;
  const label = (s: IncomeSource) => labelForIncomeSource(s.key, s.name);
  const subsources = pickedTop ? subsourcesOf(pickedTop.id).filter(shown) : [];

  const closeForm = () => {
    clearError();
    setAddingUnder(undefined);
  };

  const submit = async (name: string): Promise<boolean> => {
    const id = await create(name, addingUnder?.id ?? null);
    if (id === null) return false;
    onChange(id);
    return true;
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {topLevel.filter(shown).map((s) => (
          <Pill key={s.id} label={label(s)} active={pickedTop?.id === s.id} onPress={() => onChange(s.id)} />
        ))}
        <Pill label={t('sources.add')} dashed onPress={() => setAddingUnder(null)} />
      </View>

      {pickedTop ? (
        <View style={styles.subBlock}>
          <Typography variant="muted">{t('sources.subLabel', { parent: label(pickedTop) })}</Typography>
          <View style={styles.row}>
            {subsources.map((s) => (
              <Pill
                key={s.id}
                label={label(s)}
                active={value === s.id}
                onPress={() => onChange(value === s.id ? pickedTop.id : s.id)}
              />
            ))}
            <Pill
              label={t('sources.addSub', { parent: label(pickedTop) })}
              dashed
              onPress={() => setAddingUnder(pickedTop)}
            />
          </View>
        </View>
      ) : null}

      {pickedTop?.key === 'gift' ? <Typography variant="muted">{t('sources.giftHint')}</Typography> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('sources.manage')}
        style={styles.manage}
        onPress={() => router.push('/income/sources')}
      >
        <Icon name="settings" size={16} color={c.PRIMARY_TEXT} />
        <Typography style={styles.manageText}>{t('sources.manage')}</Typography>
      </Pressable>

      <IncomeSourceFormModal
        visible={addingUnder !== undefined}
        title={addingUnder ? t('sources.newSubTitle', { parent: label(addingUnder) }) : t('sources.newTitle')}
        error={error}
        onSubmit={submit}
        onClose={closeForm}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subBlock: {
    gap: 6,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: c.PRIMARY_GREEN,
  },
  pillActive: {
    backgroundColor: c.PRIMARY_FILL,
    borderColor: c.PRIMARY_FILL,
  },
  pillDashed: {
    borderStyle: 'dashed',
  },
  pillTextActive: {
    color: c.TEXT_INVERSE,
  },
  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 44,
  },
  manageText: {
    color: c.PRIMARY_TEXT,
  },
});
