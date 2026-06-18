import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { ProgressBar } from '@/components/ProgressBar';
import { DANGER } from '@/constants/colors';

describe('ProgressBar', () => {
  it('exposes the clamped value on the fill via accessibilityValue', () => {
    render(<ProgressBar value={64} testID="bar" />);
    expect(screen.getByTestId('bar-fill').props.accessibilityValue.now).toBe(64);
  });

  it('clamps values above 100', () => {
    render(<ProgressBar value={150} testID="bar" />);
    expect(screen.getByTestId('bar-fill').props.accessibilityValue.now).toBe(100);
  });

  it('clamps negative values to 0', () => {
    render(<ProgressBar value={-20} testID="bar" />);
    expect(screen.getByTestId('bar-fill').props.accessibilityValue.now).toBe(0);
  });

  it('still exposes the clamped value when animated', () => {
    render(<ProgressBar value={42} animated testID="bar" color={DANGER} />);
    expect(screen.getByTestId('bar-fill').props.accessibilityValue.now).toBe(42);
  });
});
