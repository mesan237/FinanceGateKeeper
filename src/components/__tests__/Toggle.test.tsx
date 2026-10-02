import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Toggle } from '@/components/Toggle';

describe('Toggle', () => {
  it('exposes itself as a switch carrying its checked state', () => {
    render(<Toggle testID="t" value onValueChange={jest.fn()} accessibilityLabel="Alerts" />);
    const toggle = screen.getByRole('switch', { name: 'Alerts' });
    expect(toggle.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
  });

  it('reports the flipped value when pressed', () => {
    const onValueChange = jest.fn();
    render(<Toggle testID="t" value={false} onValueChange={onValueChange} />);
    fireEvent.press(screen.getByTestId('t'));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('reports false when pressed while on', () => {
    const onValueChange = jest.fn();
    render(<Toggle testID="t" value onValueChange={onValueChange} />);
    fireEvent.press(screen.getByTestId('t'));
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('ignores presses while disabled', () => {
    const onValueChange = jest.fn();
    render(<Toggle testID="t" value={false} disabled onValueChange={onValueChange} />);
    const toggle = screen.getByTestId('t');
    expect(toggle.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    fireEvent.press(toggle);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
