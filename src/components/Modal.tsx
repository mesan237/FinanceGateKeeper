import React from 'react';
import {
  Modal as RNModal,
  StyleSheet,
  View,
  type ModalProps as RNModalProps,
} from 'react-native';

import { SURFACE } from '@/constants/colors';
import { RADIUS } from '@/constants/layout';

export interface ModalProps extends RNModalProps {
  children: React.ReactNode;
}

export function Modal({
  children,
  transparent = true,
  animationType = 'fade',
  ...rest
}: ModalProps) {
  return (
    <RNModal transparent={transparent} animationType={animationType} {...rest}>
      <View style={styles.backdrop}>
        <View style={styles.content}>{children}</View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS.md,
    padding: 16,
    width: '100%',
    maxWidth: 400,
  },
});
