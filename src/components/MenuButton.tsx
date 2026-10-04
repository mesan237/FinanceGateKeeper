import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { AttentionDot, attentionHint } from '@/components/AttentionDot';
import { useAnyAttention } from '@/components/AttentionProvider';
import { Icon } from '@/components/Icon';
import { ICON_SIZE } from '@/constants/icons';
import { useTheme } from '@/theme';

/**
 * The hamburger in each tab's header. Opens the drawer, and wears a dot while
 * anything in the drawer needs attention (e.g. a planned purchase due soon), so
 * the user notices without opening it.
 */
export function MenuButton() {
  const navigation = useNavigation();
  const c = useTheme();
  const { t } = useTranslation('navigation');
  const attention = useAnyAttention();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('openMenu')}
      accessibilityHint={attentionHint(attention)}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      hitSlop={12}
      style={styles.button}
    >
      <Icon name="menu" size={ICON_SIZE.md} color={c.TEXT_PRIMARY} />
      <AttentionDot counts={attention} style={styles.dot} testID="menu-attention-dot" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { marginLeft: 16 },
  dot: { position: 'absolute', top: -2, right: -4 },
});
