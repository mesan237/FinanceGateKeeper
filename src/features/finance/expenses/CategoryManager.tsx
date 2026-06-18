import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { getCategoryAvatar, getTransactionIcon } from '@/constants/categoryIcons';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { useCategories } from './expenses.hooks';
import type { Category } from './expenses.types';

/**
 * CRUD screen for the category tree. Lists each parent (as a card) with its
 * subcategories and lets the user add, rename, hide/unhide, reorder, and delete.
 * Default categories can only be hidden; deleting a custom category first asks
 * where to move its expenses so nothing is orphaned.
 */
export function CategoryManager() {
  const styles = useThemedStyles(makeStyles);
  const { managedCategories, subcategoriesOf, addCategory, rename, remove, toggleHidden, reorder } =
    useCategories();

  const [newParentName, setNewParentName] = useState('');
  const [subDrafts, setSubDrafts] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  // Parents are collapsed by default so a long tree stays scannable; the set
  // holds the ids the user has expanded to reveal subcategories.
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setDraftName(cat.name);
  };

  const saveEdit = async () => {
    if (editingId != null && draftName.trim()) {
      await rename(editingId, draftName);
    }
    setEditingId(null);
  };

  const addParent = async () => {
    if (!newParentName.trim()) return;
    await addCategory({ name: newParentName, parentId: null });
    setNewParentName('');
  };

  const addSub = async (parentId: number) => {
    const name = subDrafts[parentId] ?? '';
    if (!name.trim()) return;
    await addCategory({ name, parentId });
    setSubDrafts((drafts) => ({ ...drafts, [parentId]: '' }));
  };

  const moveParent = async (index: number, direction: -1 | 1) => {
    const ids = managedCategories.map((c) => c.id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= ids.length) return;
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    await reorder(ids);
  };

  const renderRow = (cat: Category, depth: number) => {
    const editing = editingId === cat.id;
    return (
      <View key={cat.id} style={[styles.row, depth > 0 && styles.subRow]}>
        <Avatar cat={cat} depth={depth} />
        {editing ? (
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            accessibilityLabel={`Edit name for ${cat.name}`}
            testID={`edit-input-${cat.id}`}
            style={styles.grow}
          />
        ) : (
          <Typography style={[styles.grow, cat.isHidden && styles.hidden]}>
            {cat.isHidden ? `${cat.name} (hidden)` : cat.name}
          </Typography>
        )}

        <View style={styles.actions}>
          {editing ? (
            <IconButton
              icon="check"
              tone="primary"
              accessibilityLabel={`Save ${cat.name}`}
              testID={`save-${cat.id}`}
              onPress={saveEdit}
            />
          ) : (
            <>
              <IconButton
                icon="edit"
                accessibilityLabel={`Rename ${cat.name}`}
                testID={`rename-${cat.id}`}
                onPress={() => startEdit(cat)}
              />
              <IconButton
                icon={cat.isHidden ? 'show' : 'hide'}
                accessibilityLabel={`${cat.isHidden ? 'Unhide' : 'Hide'} ${cat.name}`}
                testID={`hide-${cat.id}`}
                onPress={() => toggleHidden(cat.id, !cat.isHidden)}
              />
              {cat.isDefault ? null : (
                <IconButton
                  icon="delete"
                  tone="danger"
                  accessibilityLabel={`Delete ${cat.name}`}
                  testID={`delete-${cat.id}`}
                  onPress={() => setDeleteTarget(cat)}
                />
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  // Reassignment targets are top-level categories only — expenses move to a
  // parent, never into another subcategory.
  const reassignOptions = deleteTarget
    ? managedCategories.filter((c) => c.id !== deleteTarget.id)
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader title="Categories" />

      <View style={styles.addBar}>
        <TextInput
          value={newParentName}
          onChangeText={setNewParentName}
          placeholder="New category"
          accessibilityLabel="New category name"
          testID="new-parent-input"
          style={styles.grow}
        />
        <IconButton
          icon="add"
          variant="filled"
          accessibilityLabel="Add category"
          testID="add-parent-btn"
          onPress={addParent}
        />
      </View>

      {managedCategories.map((parent, index) => {
        const subs = subcategoriesOf(parent.id, true);
        const isExpanded = expandedIds.has(parent.id);
        return (
          <Card key={parent.id} style={styles.group}>
            <View style={styles.parentHeader}>
              <IconButton
                icon={isExpanded ? 'moveDown' : 'forward'}
                accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${parent.name}`}
                testID={`toggle-${parent.id}`}
                onPress={() => toggleExpanded(parent.id)}
              />
              <View style={styles.grow}>{renderRow(parent, 0)}</View>
              {isExpanded ? null : (
                <Typography variant="muted" style={styles.subCount}>
                  {subs.length}
                </Typography>
              )}
              <IconButton
                icon="moveUp"
                accessibilityLabel={`Move ${parent.name} up`}
                disabled={index === 0}
                onPress={() => moveParent(index, -1)}
              />
              <IconButton
                icon="moveDown"
                accessibilityLabel={`Move ${parent.name} down`}
                disabled={index === managedCategories.length - 1}
                onPress={() => moveParent(index, 1)}
              />
            </View>

            {isExpanded ? (
              <>
                {subs.map((sub) => renderRow(sub, 1))}

                <View style={[styles.row, styles.subRow, styles.addSubRow]}>
                  <TextInput
                    value={subDrafts[parent.id] ?? ''}
                    onChangeText={(text) =>
                      setSubDrafts((drafts) => ({ ...drafts, [parent.id]: text }))
                    }
                    placeholder="New subcategory"
                    accessibilityLabel={`New subcategory under ${parent.name}`}
                    style={styles.grow}
                  />
                  <IconButton
                    icon="add"
                    variant="filled"
                    accessibilityLabel={`Add subcategory under ${parent.name}`}
                    testID={`add-sub-${parent.id}`}
                    onPress={() => addSub(parent.id)}
                  />
                </View>
              </>
            ) : null}
          </Card>
        );
      })}

      <Modal visible={deleteTarget !== null} onRequestClose={() => setDeleteTarget(null)}>
        {deleteTarget ? (
          <View>
            <Typography variant="subheading">
              {`Move expenses from "${deleteTarget.name}" to:`}
            </Typography>
            <ScrollView style={styles.optionList}>
              {reassignOptions.map((option) => (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Reassign to ${option.name}`}
                  testID={`reassign-${option.id}`}
                  style={styles.optionRow}
                  onPress={async () => {
                    await remove(deleteTarget.id, option.id);
                    setDeleteTarget(null);
                  }}
                >
                  <Typography>{option.name}</Typography>
                </Pressable>
              ))}
            </ScrollView>
            <Button label="Cancel" variant="secondary" onPress={() => setDeleteTarget(null)} />
          </View>
        ) : (
          <View />
        )}
      </Modal>
    </ScrollView>
  );
}

/** Emoji (default categories) or a coloured letter chip (custom) leading a row. */
function Avatar({ cat, depth }: { cat: Category; depth: number }) {
  const styles = useThemedStyles(makeStyles);
  const emoji = getTransactionIcon('expense', cat.name);
  const sized = depth > 0 ? styles.avatarSub : styles.avatar;
  if (emoji) {
    return (
      <View style={[sized, styles.avatarEmoji]}>
        <Typography style={depth > 0 ? styles.emojiSub : styles.emoji}>{emoji}</Typography>
      </View>
    );
  }
  const { color, letter } = getCategoryAvatar(cat.name);
  return (
    <View style={[sized, { backgroundColor: color }]}>
      <Typography style={styles.avatarLetter}>{letter}</Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  addBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  group: { gap: 4 },
  parentHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  subRow: {
    paddingLeft: 12,
    marginLeft: 6,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: c.BORDER,
  },
  addSubRow: { paddingTop: 8 },
  grow: { flex: 1 },
  subCount: { minWidth: 18, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSub: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { backgroundColor: c.SURFACE_MUTED },
  emoji: { fontSize: 18, lineHeight: 24 },
  emojiSub: { fontSize: 13, lineHeight: 18 },
  avatarLetter: { color: '#ffffff', fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD, fontSize: 14 },
  hidden: { color: c.TEXT_MUTED, fontStyle: 'italic' },
  optionList: { maxHeight: 240, marginVertical: 8 },
  optionRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.BORDER,
  },
});
