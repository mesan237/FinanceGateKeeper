import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { labelForIncomeSource } from '@/constants/incomeSources';
import { useThemedStyles, type ThemeColors } from '@/theme';

import type { IncomeSource } from './income.types';
import { IncomeSourceFormModal } from './IncomeSourceFormModal';
import { useIncomeSources } from './incomeSources.hooks';

/** The open form: a new source (under `parent`, or top-level) or a rename. */
type Form = { kind: 'add'; parent: IncomeSource | null } | { kind: 'rename'; source: IncomeSource };

const label = (s: IncomeSource) => labelForIncomeSource(s.key, s.name);

/**
 * Manage income sources (VS-91): every source with its subsources under it,
 * hidden ones marked. Add a source or a subsource (one level deep), rename one
 * the user made (built-ins follow the app language), hide or show any of them.
 * Hiding never touches income already logged.
 */
export function IncomeSourcesScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('income');
  const { topLevel, subsourcesOf, create, rename, toggleHidden, error, clearError } = useIncomeSources();
  const [form, setForm] = useState<Form | null>(null);

  const closeForm = () => {
    clearError();
    setForm(null);
  };

  const submit = async (name: string): Promise<boolean> => {
    if (!form) return false;
    if (form.kind === 'rename') return rename(form.source.id, name);
    return (await create(name, form.parent?.id ?? null)) !== null;
  };

  const formTitle = !form
    ? ''
    : form.kind === 'rename'
      ? t('sources.renameTitle')
      : form.parent
        ? t('sources.newSubTitle', { parent: label(form.parent) })
        : t('sources.newTitle');

  const renderRow = (source: IncomeSource, depth: 0 | 1) => {
    const name = label(source);
    return (
      <View key={source.id} style={[styles.row, depth === 1 && styles.subRow]}>
        <View style={styles.grow}>
          <Typography style={source.isHidden ? styles.hiddenName : undefined}>{name}</Typography>
          {source.isHidden ? (
            <Typography variant="muted" testID={`income-source-hidden-${source.id}`}>
              {t('sources.hidden')}
            </Typography>
          ) : source.key !== null ? (
            <Typography variant="muted">{t('sources.builtIn')}</Typography>
          ) : null}
        </View>
        {source.key === null ? (
          <IconButton
            icon="edit"
            accessibilityLabel={t('sources.rename', { name })}
            onPress={() => setForm({ kind: 'rename', source })}
          />
        ) : null}
        <IconButton
          icon={source.isHidden ? 'show' : 'hide'}
          accessibilityLabel={t(source.isHidden ? 'sources.show' : 'sources.hide', { name })}
          onPress={() => toggleHidden(source)}
        />
        {depth === 0 ? (
          <IconButton
            icon="add"
            accessibilityLabel={t('sources.addSub', { parent: name })}
            onPress={() => setForm({ kind: 'add', parent: source })}
          />
        ) : null}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader title={t('sources.screenTitle')} />
      <Typography variant="muted">{t('sources.screenIntro')}</Typography>
      <Button label={t('sources.addTopLevel')} onPress={() => setForm({ kind: 'add', parent: null })} />

      {topLevel.map((source) => (
        <Card key={source.id} style={styles.group}>
          {renderRow(source, 0)}
          {subsourcesOf(source.id).map((sub) => renderRow(sub, 1))}
        </Card>
      ))}

      <IncomeSourceFormModal
        visible={form !== null}
        title={formTitle}
        initialName={form?.kind === 'rename' ? form.source.name : ''}
        error={error}
        onSubmit={submit}
        onClose={closeForm}
      />
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  group: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
  },
  subRow: {
    paddingLeft: 20,
  },
  grow: {
    flex: 1,
  },
  hiddenName: {
    color: c.TEXT_MUTED,
  },
});
