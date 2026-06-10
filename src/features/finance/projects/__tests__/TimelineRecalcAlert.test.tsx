import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { TimelineRecalcAlert } from '@/features/finance/projects/TimelineRecalcAlert';
import type { TimelineShift } from '@/features/finance/projects/projects.types';

const SHIFT: TimelineShift = {
  projectId: 1,
  previous: '2026-03-15',
  next: '2026-04-15',
  shiftedMonths: 1,
};

describe('TimelineRecalcAlert', () => {
  it('shows the old and new completion dates', () => {
    render(
      <TimelineRecalcAlert
        shift={SHIFT}
        projectName="E-commerce Launch"
        onAcceptDelay={jest.fn()}
        onPullFromSavings={jest.fn()}
        onReprioritize={jest.fn()}
      />,
    );
    expect(screen.getByText(/E-commerce Launch/)).toBeTruthy();
    expect(screen.getByText(/15 March 2026/)).toBeTruthy();
    expect(screen.getByText(/15 April 2026/)).toBeTruthy();
  });

  it('fires each option handler', () => {
    const onAcceptDelay = jest.fn();
    const onPullFromSavings = jest.fn();
    const onReprioritize = jest.fn();
    render(
      <TimelineRecalcAlert
        shift={SHIFT}
        projectName="E-commerce Launch"
        onAcceptDelay={onAcceptDelay}
        onPullFromSavings={onPullFromSavings}
        onReprioritize={onReprioritize}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Accept delay' }));
    expect(onAcceptDelay).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole('button', { name: 'Pull from savings' }));
    expect(onPullFromSavings).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole('button', { name: 'Reprioritize' }));
    expect(onReprioritize).toHaveBeenCalledTimes(1);
  });
});
