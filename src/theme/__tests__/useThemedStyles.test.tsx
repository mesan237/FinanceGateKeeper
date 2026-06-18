import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LIGHT_COLORS } from '@/theme/palettes';
import type { ThemeColors } from '@/theme/theme.types';
import { useThemedStyles } from '@/theme/useThemedStyles';

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({ box: { backgroundColor: c.SURFACE } });

function Boxed() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View testID="box" style={styles.box}>
      <Text>hi</Text>
    </View>
  );
}

describe('useThemedStyles', () => {
  it('builds styles from the active (light) palette by default', () => {
    render(<Boxed />);
    const box = screen.getByTestId('box');
    expect(StyleSheet.flatten(box.props.style).backgroundColor).toBe(LIGHT_COLORS.SURFACE);
  });
});
