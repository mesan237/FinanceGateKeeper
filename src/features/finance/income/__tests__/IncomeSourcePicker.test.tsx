import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { INCOME_SOURCES } from '@/constants/incomeSources';
import { IncomeSourcePicker } from '@/features/finance/income/IncomeSourcePicker';

describe('IncomeSourcePicker', () => {
  it('renders one pill per INCOME_SOURCES entry', () => {
    render(<IncomeSourcePicker value={null} onChange={jest.fn()} />);
    for (const { label } of INCOME_SOURCES) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('calls onChange with the source value when a pill is tapped', () => {
    const onChange = jest.fn();
    render(<IncomeSourcePicker value={null} onChange={onChange} />);

    fireEvent.press(screen.getByRole('button', { name: 'Freelance' }));
    expect(onChange).toHaveBeenCalledWith('freelance');
  });

  it('marks the selected pill as accessibility-selected', () => {
    render(<IncomeSourcePicker value="salary" onChange={jest.fn()} />);

    const salary = screen.getByRole('button', { name: 'Salary' });
    expect(salary.props.accessibilityState.selected).toBe(true);

    const freelance = screen.getByRole('button', { name: 'Freelance' });
    expect(freelance.props.accessibilityState.selected).toBe(false);
  });
});
