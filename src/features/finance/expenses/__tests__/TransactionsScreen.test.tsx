import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

// Stub the feed so the screen test focuses on the FAB ↔ sheet wiring.
jest.mock('@/features/finance/expenses/TransactionList', () => {
  const { View } = require('react-native');
  return { TransactionList: () => <View testID="transaction-list-stub" /> };
});

// Stub the sheet: renders only when `visible`, and a press routes to `onClose`
// so we can exercise open/close without mounting the full panel/hook tree.
jest.mock('@/features/finance/expenses/AddTransactionSheet', () => {
  const { Pressable } = require('react-native');
  return {
    AddTransactionSheet: (props: { visible: boolean; onClose: () => void }) =>
      props.visible ? <Pressable testID="sheet-open" onPress={props.onClose} /> : null,
  };
});

import { TransactionsScreen } from '@/features/finance/expenses/TransactionsScreen';

describe('TransactionsScreen', () => {
  it('shows the feed and a single Add FAB, with the sheet closed initially', () => {
    render(<TransactionsScreen />);
    expect(screen.getByTestId('transaction-list-stub')).toBeTruthy();
    expect(screen.getByTestId('add-transaction-fab')).toBeTruthy();
    expect(screen.queryByTestId('sheet-open')).toBeNull();
  });

  it('opens the Add-Transaction sheet when the FAB is pressed', () => {
    render(<TransactionsScreen />);
    fireEvent.press(screen.getByTestId('add-transaction-fab'));
    expect(screen.getByTestId('sheet-open')).toBeTruthy();
  });

  it('closes the sheet when it requests close', () => {
    render(<TransactionsScreen />);
    fireEvent.press(screen.getByTestId('add-transaction-fab'));
    fireEvent.press(screen.getByTestId('sheet-open'));
    expect(screen.queryByTestId('sheet-open')).toBeNull();
  });
});
