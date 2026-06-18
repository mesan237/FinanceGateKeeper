import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { AnimatedCounter } from '@/components/AnimatedCounter';

describe('AnimatedCounter', () => {
  it('renders the value formatted as FCFA by default', () => {
    render(<AnimatedCounter value={45000} />);
    expect(screen.getByText('45 000 FCFA')).toBeTruthy();
  });

  it('applies a custom formatter', () => {
    render(<AnimatedCounter value={22} format={(n) => `${n}%`} />);
    expect(screen.getByText('22%')).toBeTruthy();
  });

  it('is reachable via testID', () => {
    render(<AnimatedCounter value={1000} testID="counter" />);
    expect(screen.getByTestId('counter')).toBeTruthy();
  });

  it('converges to an updated value', async () => {
    const { rerender } = render(<AnimatedCounter value={1000} testID="counter" />);
    rerender(<AnimatedCounter value={3000} testID="counter" />);
    // A value change animates from the old figure to the new one; it settles on the target.
    expect(await screen.findByText('3 000 FCFA')).toBeTruthy();
  });
});
