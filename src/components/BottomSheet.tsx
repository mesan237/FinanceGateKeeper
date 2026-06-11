import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  testID?: string;
}

/**
 * A bottom-anchored sheet built on the native `Modal`. The backdrop fades in
 * and the panel springs up from the bottom (via reanimated entering presets),
 * giving a premium slide-up without a gesture/library dependency. Tapping the
 * backdrop closes it; the panel keeps clear of the keyboard.
 */
export function BottomSheet({ visible, onClose, children, testID }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.fill} testID={testID}>
        <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            testID={testID ? `${testID}-backdrop` : 'bottom-sheet-backdrop'}
            style={styles.backdropPress}
            onPress={onClose}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoider}
          pointerEvents="box-none"
        >
          <Animated.View entering={SlideInDown.duration(240)} style={styles.sheet}>
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropPress: {
    flex: 1,
  },
  avoider: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D5DD',
    marginBottom: 12,
  },
});
