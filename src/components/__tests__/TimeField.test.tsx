import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { TimeField } from '@/components/TimeField';

describe('TimeField', () => {
  it('renders the HH:mm value on the pill', () => {
    render(<TimeField value="21:00" onChange={jest.fn()} testID="time-field" />);
    expect(screen.getByText('21:00')).toBeTruthy();
  });

  it('renders a fallback label and seeds the picker to now when the value is empty', () => {
    render(<TimeField value="" onChange={jest.fn()} testID="time-field" />);
    expect(screen.getByText('Set time')).toBeTruthy();
    fireEvent.press(screen.getByTestId('time-field'));
    // No stored time yet → the picker opens seeded to a real (current) time.
    expect(screen.getByTestId('time-picker').props.value instanceof Date).toBe(true);
  });

  it('does not show the picker until the pill is pressed', () => {
    render(<TimeField value="21:00" onChange={jest.fn()} testID="time-field" />);
    expect(screen.queryByTestId('time-picker')).toBeNull();
    fireEvent.press(screen.getByTestId('time-field'));
    expect(screen.getByTestId('time-picker')).toBeTruthy();
  });

  it('seeds the picker from the HH:mm value', () => {
    render(<TimeField value="07:05" onChange={jest.fn()} testID="time-field" />);
    fireEvent.press(screen.getByTestId('time-field'));
    const picker = screen.getByTestId('time-picker');
    const seeded: Date = picker.props.value;
    expect(seeded.getHours()).toBe(7);
    expect(seeded.getMinutes()).toBe(5);
  });

  it('emits a zero-padded HH:mm string for a picked time', () => {
    const onChange = jest.fn();
    render(<TimeField value="21:00" onChange={onChange} testID="time-field" />);
    fireEvent.press(screen.getByTestId('time-field'));
    fireEvent(screen.getByTestId('time-picker'), 'change', { type: 'set' }, new Date(2020, 0, 1, 7, 5));
    expect(onChange).toHaveBeenCalledWith('07:05');
  });

  it('does not emit when the picker is dismissed', () => {
    const onChange = jest.fn();
    render(<TimeField value="21:00" onChange={onChange} testID="time-field" />);
    fireEvent.press(screen.getByTestId('time-field'));
    fireEvent(screen.getByTestId('time-picker'), 'change', { type: 'dismissed' }, undefined);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('pins a fixed-height spinner display so the picker never resizes its host', () => {
    render(<TimeField value="21:00" onChange={jest.fn()} testID="time-field" />);
    fireEvent.press(screen.getByTestId('time-field'));
    expect(screen.getByTestId('time-picker').props.display).toBe('spinner');
  });
});
