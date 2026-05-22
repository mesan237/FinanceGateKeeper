import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ProgressBar';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';

describe('shared primitives', () => {
  it('renders Button without crashing', () => {
    render(<Button label="Save" onPress={() => undefined} />);
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('renders Typography without crashing', () => {
    render(<Typography>Hello</Typography>);
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('renders TextInput without crashing', () => {
    render(<TextInput value="" onChangeText={() => undefined} placeholder="Amount" />);
    expect(screen.getByPlaceholderText('Amount')).toBeTruthy();
  });

  it('renders Card without crashing', () => {
    render(
      <Card>
        <Text>card body</Text>
      </Card>,
    );
    expect(screen.getByText('card body')).toBeTruthy();
  });

  it('renders Modal without crashing when visible', () => {
    render(
      <Modal visible onRequestClose={() => undefined}>
        <Text>modal body</Text>
      </Modal>,
    );
    expect(screen.getByText('modal body')).toBeTruthy();
  });

  it('renders ProgressBar without crashing', () => {
    render(<ProgressBar value={50} testID="bar" />);
    expect(screen.getByTestId('bar')).toBeTruthy();
  });

  it('Button invokes onPress when fired', () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} />);
    fireEvent.press(screen.getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ProgressBar clamps values below 0 to 0', () => {
    render(<ProgressBar value={-25} testID="bar" />);
    const fill = screen.getByTestId('bar-fill');
    expect(fill.props.accessibilityValue.now).toBe(0);
  });

  it('ProgressBar clamps values above 100 to 100', () => {
    render(<ProgressBar value={150} testID="bar" />);
    const fill = screen.getByTestId('bar-fill');
    expect(fill.props.accessibilityValue.now).toBe(100);
  });
});
