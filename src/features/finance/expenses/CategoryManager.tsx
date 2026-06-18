import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { FONT_FAMILY } from '@/constants/fonts';

import { useCategories } from './expenses.hooks';
import type { Category } from './expenses.types';

/**
 * CRUD screen for the category tree. Lists each parent with its subcategories
 * and lets the user add, rename, hide/unhide, reorder, and delete. Default
 * categories can only be hidden; deleting a custom category first asks where to
 * move its expenses so nothing is orphaned.
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

  const renderRow = (cat: Category, depth: number) => (
    <View key={cat.id} style={[styles.row, depth > 0 && styles.subRow]}>
      {editingId === cat.id ? (
        <View style={styles.line}>
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            accessibilityLabel={`Edit name for ${cat.name}`}
            testID={`edit-input-${cat.id}`}
            style={styles.grow}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Save ${cat.name}`}
            testID={`save-${cat.id}`}
            onPress={saveEdit}
          >
            <Typography style={styles.action}>Save</Typography>
          </Pressable>
        </View>
      ) : (
        <View style={styles.line}>
          <Typography style={[styles.grow, cat.isHidden && styles.hidden]}>
            {cat.isHidden ? `${cat.name} (hidden)` : cat.name}
          </Typography>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Rename ${cat.name}`}
            testID={`rename-${cat.id}`}
            onPress={() => startEdit(cat)}
          >
            <Typography style={styles.action}>Rename</Typography>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${cat.isHidden ? 'Unhide' : 'Hide'} ${cat.name}`}
            testID={`hide-${cat.id}`}
            onPress={() => toggleHidden(cat.id, !cat.isHidden)}
          >
            <Typography style={styles.action}>{cat.isHidden ? 'Unhide' : 'Hide'}</Typography>
          </Pressable>
          {cat.isDefault ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${cat.name}`}
              testID={`delete-${cat.id}`}
              onPress={() => setDeleteTarget(cat)}
            >
              <Typography style={styles.danger}>Delete</Typography>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );

  // Reassignment targets are top-level categories only — expenses move to a
  // parent, never into another subcategory.
  const reassignOptions = deleteTarget
    ? managedCategories.filter((c) => c.id !== deleteTarget.id)
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader title="Categories" />

      <View style={styles.line}>
        <TextInput
          value={newParentName}
          onChangeText={setNewParentName}
          placeholder="New category"
          accessibilityLabel="New category name"
          testID="new-parent-input"
          style={styles.grow}
        />
        <Button label="Add" onPress={addParent} testID="add-parent-btn" />
      </View>

      {managedCategories.map((parent, index) => (
        <View key={parent.id} style={styles.group}>
          <View style={styles.line}>
            <View style={styles.grow}>{renderRow(parent, 0)}</View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Move ${parent.name} up`}
              onPress={() => moveParent(index, -1)}
            >
              <Typography style={styles.action}>Up</Typography>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Move ${parent.name} down`}
              onPress={() => moveParent(index, 1)}
            >
              <Typography style={styles.action}>Down</Typography>
            </Pressable>
          </View>

          {subcategoriesOf(parent.id, true).map((sub) => renderRow(sub, 1))}

          <View style={[styles.line, styles.subRow]}>
            <TextInput
              value={subDrafts[parent.id] ?? ''}
              onChangeText={(text) =>
                setSubDrafts((drafts) => ({ ...drafts, [parent.id]: text }))
              }
              placeholder="New subcategory"
              accessibilityLabel={`New subcategory under ${parent.name}`}
              style={styles.grow}
            />
            <Button
              label="Add"
              onPress={() => addSub(parent.id)}
              accessibilityLabel={`Add subcategory under ${parent.name}`}
              testID={`add-sub-${parent.id}`}
            />
          </View>
        </View>
      ))}

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
            <Button label="Cancel" onPress={() => setDeleteTarget(null)} />
          </View>
        ) : (
          <View />
        )}
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  group: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.BORDER,
    paddingTop: 8,
  },
  row: { paddingVertical: 4 },
  subRow: { paddingLeft: 16 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  action: { color: c.PRIMARY_GREEN, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  danger: { color: c.DANGER, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  hidden: { color: c.TEXT_MUTED, fontStyle: 'italic' },
  optionList: { maxHeight: 240, marginVertical: 8 },
  optionRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.BORDER,
  },
});
