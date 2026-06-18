import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { BORDER, DANGER, SUCCESS } from '@/constants/colors';

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

  it('renders the track with the passed trackColor', () => {
    render(<ProgressBar value={40} testID="bar" trackColor={SUCCESS} />);
    const track = StyleSheet.flatten(screen.getByTestId('bar').props.style);
    expect(track.backgroundColor).toBe(SUCCESS);
  });

  it('defaults the track color to BORDER when trackColor is omitted', () => {
    render(<ProgressBar value={40} testID="bar" />);
    const track = StyleSheet.flatten(screen.getByTestId('bar').props.style);
    expect(track.backgroundColor).toBe(BORDER);
  });
});
