import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { MonthStepper } from '@/components/MonthStepper';
import { Skeleton, SkeletonRows } from '@/components/Skeleton';

describe('EmptyState', () => {
  it('renders the title and subtitle', () => {
    render(<EmptyState icon="budget" title="No budget yet" subtitle="Plan your month." />);
    expect(screen.getByText('No budget yet')).toBeTruthy();
    expect(screen.getByText('Plan your month.')).toBeTruthy();
  });

  it('renders no action when none is supplied', () => {
    render(<EmptyState icon="budget" title="No budget yet" testID="empty" />);
    expect(screen.queryByTestId('empty-action')).toBeNull();
  });

  it('fires onAction when the primary action is pressed', () => {
    const onAction = jest.fn();
    render(
      <EmptyState icon="budget" title="No budget yet" actionLabel="Plan" onAction={onAction} />,
    );
    fireEvent.press(screen.getByText('Plan'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders a secondary action only alongside a primary one', () => {
    const onAction = jest.fn();
    const onSecondary = jest.fn();
    render(
      <EmptyState
        icon="budget"
        title="No budget yet"
        actionLabel="Plan"
        onAction={onAction}
        secondaryActionLabel="Later"
        onSecondaryAction={onSecondary}
      />,
    );
    fireEvent.press(screen.getByText('Later'));
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });
});

describe('LoadingState', () => {
  it('renders its label', () => {
    render(<LoadingState label="Loading your budget…" />);
    expect(screen.getByText('Loading your budget…')).toBeTruthy();
  });

  it('renders without a label', () => {
    render(<LoadingState testID="loading" />);
    expect(screen.getByTestId('loading')).toBeTruthy();
  });
});

describe('Skeleton', () => {
  it('applies the requested width and height', () => {
    render(<Skeleton width={120} height={20} testID="sk" />);
    const style = screen.getByTestId('sk').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.flat()) : style;
    expect(flat.width).toBe(120);
    expect(flat.height).toBe(20);
  });

  it('renders the requested number of placeholder rows', () => {
    render(<SkeletonRows count={4} testID="rows" />);
    // Each row draws an avatar, two text lines, and an amount.
    expect(screen.getByTestId('rows').children).toHaveLength(4);
  });
});

describe('MonthStepper', () => {
  it('renders the period label', () => {
    render(
      <MonthStepper
        label="August 2026"
        onPrev={jest.fn()}
        onNext={jest.fn()}
        testIDPrefix="month"
      />,
    );
    expect(screen.getByText('August 2026')).toBeTruthy();
  });

  it('steps backward', () => {
    const onPrev = jest.fn();
    render(
      <MonthStepper label="August 2026" onPrev={onPrev} onNext={jest.fn()} testIDPrefix="month" />,
    );
    fireEvent.press(screen.getByTestId('month-prev'));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('steps forward', () => {
    const onNext = jest.fn();
    render(
      <MonthStepper label="August 2026" onPrev={jest.fn()} onNext={onNext} testIDPrefix="month" />,
    );
    fireEvent.press(screen.getByTestId('month-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('does not step forward when the next arrow is disabled', () => {
    const onNext = jest.fn();
    render(
      <MonthStepper
        label="August 2026"
        onPrev={jest.fn()}
        onNext={onNext}
        nextDisabled
        testIDPrefix="month"
      />,
    );
    fireEvent.press(screen.getByTestId('month-next'));
    expect(onNext).not.toHaveBeenCalled();
  });
});
