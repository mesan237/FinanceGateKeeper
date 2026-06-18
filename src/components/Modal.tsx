import React from 'react';
import {
  Modal as RNModal,
  StyleSheet,
  View,
  type ModalProps as RNModalProps,
} from 'react-native';

import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

export interface ModalProps extends RNModalProps {
  children: React.ReactNode;
}

export function Modal({
  children,
  transparent = true,
  animationType = 'fade',
  ...rest
}: ModalProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <RNModal transparent={transparent} animationType={animationType} {...rest}>
      <View style={styles.backdrop}>
        <View style={styles.content}>{children}</View>
      </View>
    </RNModal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: c.SURFACE,
    borderRadius: RADIUS.md,
    padding: 16,
    width: '100%',
    maxWidth: 400,
  },
});
