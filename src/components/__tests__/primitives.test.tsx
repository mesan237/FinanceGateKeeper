import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ProgressBar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { toISODate } from '@/utils/formatDate';

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

  it('Button shows a spinner and blocks onPress while loading', () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} loading testID="save-btn" />);
    // The label is replaced by the indicator while loading.
    expect(screen.queryByText('Save')).toBeNull();
    fireEvent.press(screen.getByTestId('save-btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('Button renders the danger variant with its destructive label color', () => {
    render(<Button label="Delete" variant="danger" onPress={() => undefined} />);
    const label = screen.getByText('Delete');
    const flattened = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style)
      : label.props.style;
    expect(flattened.color).toBe('#C62828'); // DANGER_TEXT
  });
});

describe('AmountInput', () => {
  it('renders the FCFA suffix and groups the displayed value', () => {
    render(<AmountInput value="50000" onChangeText={() => undefined} />);
    expect(screen.getByText('FCFA')).toBeTruthy();
    expect(screen.getByDisplayValue('50 000')).toBeTruthy();
  });

  it('strips non-digits and emits a raw digit string', () => {
    const onChangeText = jest.fn();
    render(<AmountInput value="" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '12 a3b4');
    expect(onChangeText).toHaveBeenCalledWith('1234');
  });
});

describe('DateField', () => {
  it('shows the relative label and emits ISO from a picked date', () => {
    const onChange = jest.fn();
    // Use the real "today" so the relative label is deterministically "Today".
    render(<DateField value={toISODate(new Date())} onChange={onChange} testID="df" />);
    expect(screen.getByText('Today')).toBeTruthy();

    fireEvent.press(screen.getByTestId('df'));
    fireEvent(screen.getByTestId('date-picker'), 'change', { type: 'set' }, new Date(2026, 5, 20));
    expect(onChange).toHaveBeenCalledWith('2026-06-20');
  });

  it('ignores a dismissed picker', () => {
    const onChange = jest.fn();
    render(<DateField value="2026-06-11" onChange={onChange} testID="df" />);
    fireEvent.press(screen.getByTestId('df'));
    fireEvent(screen.getByTestId('date-picker'), 'change', { type: 'dismissed' }, undefined);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Icon', () => {
  it('renders a registry glyph for a known name', () => {
    render(<Icon name="back" testID="icon-back" />);
    expect(screen.getByTestId('icon-back')).toBeTruthy();
  });
});

describe('SegmentedControl', () => {
  const SEGMENTS = [
    { key: 'a', label: 'Alpha' },
    { key: 'b', label: 'Beta' },
  ];

  it('renders every segment label', () => {
    render(<SegmentedControl segments={SEGMENTS} value="a" onChange={() => undefined} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('fires onChange with the pressed segment key', () => {
    const onChange = jest.fn();
    render(<SegmentedControl testID="seg" segments={SEGMENTS} value="a" onChange={onChange} />);
    fireEvent.press(screen.getByTestId('seg-b'));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('BottomSheet', () => {
  it('renders children when visible', () => {
    render(
      <BottomSheet visible onClose={() => undefined}>
        <Text>sheet body</Text>
      </BottomSheet>,
    );
    expect(screen.getByText('sheet body')).toBeTruthy();
  });

  it('calls onClose when the backdrop is pressed', () => {
    const onClose = jest.fn();
    render(
      <BottomSheet visible onClose={onClose} testID="sheet">
        <Text>sheet body</Text>
      </BottomSheet>,
    );
    fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
