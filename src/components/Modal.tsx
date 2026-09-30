import React, { useContext, useEffect, useId } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  View,
  type ModalProps as RNModalProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SheetHostContext } from '@/components/BottomSheet';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

export interface ModalProps extends RNModalProps {
  children: React.ReactNode;
}

/**
 * A centered card dialog (category/account pickers, delete confirms, the
 * over-budget alert, ...). Normally opens its own native `Modal`. When
 * rendered inside a `BottomSheet` (`SheetHostContext` is non-null), it
 * instead registers its content with the sheet's own top-level layer and
 * renders nothing here — opening a second native `Modal` on top of the
 * sheet's would stack two translucent backdrops into one visibly darker
 * overlay and is a known-flaky pattern on Android (stacked native `Modal`
 * windows can clip or mis-order). The standalone path (pushed routes like
 * `ExpenseLogScreen`) is unaffected.
 */
export function Modal({
  children,
  visible,
  onRequestClose,
  transparent = true,
  animationType = 'fade',
  ...rest
}: ModalProps) {
  const styles = useThemedStyles(makeStyles);
  const host = useContext(SheetHostContext);
  const overlayId = useId();

  useEffect(() => {
    if (!host) return undefined;
    if (!visible) {
      host.unregister(overlayId);
      return undefined;
    }
    host.register(
      overlayId,
      <DialogShell style={styles.backdropHosted} scrollStyle={styles.scroll} cardStyle={styles.content}>
        {children}
      </DialogShell>,
    );
    return () => host.unregister(overlayId);
  }, [host, overlayId, visible, children, styles]);

  // The native `Modal` normally wires Android's hardware back button to
  // `onRequestClose` itself; replicate that here since the hosted path never
  // mounts one.
  useEffect(() => {
    if (!host || !visible || !onRequestClose) return undefined;
    // Every call site in this codebase passes a zero-arg callback (they never
    // read the native event); RNModalProps types it as taking one anyway.
    const close = onRequestClose as unknown as () => void;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [host, visible, onRequestClose]);

  if (host) return null;

  return (
    <RNModal
      transparent={transparent}
      animationType={animationType}
      visible={visible}
      // Full-window coordinates, so the keyboard overlap is measured correctly.
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onRequestClose}
      {...rest}
    >
      <DialogShell style={styles.backdrop} scrollStyle={styles.scroll} cardStyle={styles.content}>
        {children}
      </DialogShell>
    </RNModal>
  );
}

interface DialogShellProps {
  children: React.ReactNode;
  style: StyleProp<ViewStyle>;
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
}

/**
 * The dimmed backdrop and card of a dialog. The card is centred in whatever the
 * keyboard leaves free (`behavior="padding"` on both platforms — see
 * `KeyboardAvoider`), and scrolls when a tall form does not fit, so no field of
 * an edit dialog can end up behind the keyboard.
 */
function DialogShell({ children, style, scrollStyle, cardStyle }: DialogShellProps) {
  return (
    <KeyboardAvoidingView behavior="padding" style={style}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollStyle}
      >
        <View style={cardStyle}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
  },
  backdropHosted: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    backgroundColor: c.SURFACE,
    borderRadius: RADIUS.md,
    padding: 16,
    width: '100%',
    maxWidth: 400,
  },
});
