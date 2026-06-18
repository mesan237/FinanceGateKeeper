import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { DANGER, SUCCESS_TEXT } from '@/constants/colors';
import { CashflowCard } from '@/features/finance/dashboard/CashflowCard';

describe('CashflowCard', () => {
  it('renders income, expenses and net figures', () => {
    render(<CashflowCard cashflow={{ income: 100000, expenses: 5000, net: 95000 }} />);
    expect(screen.getByText('100 000 FCFA')).toBeTruthy();
    expect(screen.getByText('5 000 FCFA')).toBeTruthy();
    expect(screen.getByText('95 000 FCFA')).toBeTruthy();
  });

  it('colours a positive net green', () => {
    render(<CashflowCard cashflow={{ income: 100000, expenses: 5000, net: 95000 }} />);
    const net = screen.getByTestId('cashflow-net');
    expect(StyleSheet.flatten(net.props.style).color).toBe(SUCCESS_TEXT);
  });

  it('colours a negative net (deficit) in danger', () => {
    render(<CashflowCard cashflow={{ income: 5000, expenses: 20000, net: -15000 }} />);
    expect(screen.getByText('-15 000 FCFA')).toBeTruthy();
    const net = screen.getByTestId('cashflow-net');
    expect(StyleSheet.flatten(net.props.style).color).toBe(DANGER);
  });

  it('is accessible via testID', () => {
    render(<CashflowCard cashflow={{ income: 100000, expenses: 5000, net: 95000 }} />);
    expect(screen.getByTestId('cashflow-card')).toBeTruthy();
  });
});
