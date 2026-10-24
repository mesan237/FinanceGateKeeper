import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { MonthStepper } from '@/components/MonthStepper';
import { Skeleton, SkeletonRows } from '@/components/Skeleton';
import i18n from '@/i18n';

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

describe('ErrorState', () => {
  it('says plainly that the data could not load and that nothing is lost (UX-16)', () => {
    render(<ErrorState onRetry={jest.fn()} testID="err" />);
    expect(screen.getByText("Couldn't load this")).toBeTruthy();
    expect(screen.getByText('Nothing you logged is lost.')).toBeTruthy();
  });

  it('retries when "Try again" is pressed', () => {
    const onRetry = jest.fn();
    render(<ErrorState onRetry={onRetry} testID="err" />);
    fireEvent.press(screen.getByTestId('err-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('takes a title naming what failed, and shows the technical message as a detail', () => {
    render(
      <ErrorState title="Couldn't load your budget" message="SQLITE_BUSY" onRetry={jest.fn()} testID="err" />,
    );
    expect(screen.getByText("Couldn't load your budget")).toBeTruthy();
    expect(screen.getByTestId('err-detail')).toHaveTextContent('SQLITE_BUSY');
  });

  it('has a compact form for a card inside a screen, with the same retry', () => {
    const onRetry = jest.fn();
    render(<ErrorState compact onRetry={onRetry} testID="err" />);
    expect(screen.getByText("Couldn't load this")).toBeTruthy();
    fireEvent.press(screen.getByTestId('err-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('reads in French', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    render(<ErrorState onRetry={jest.fn()} testID="err" />);
    expect(screen.getByText('Impossible de charger')).toBeTruthy();
    expect(screen.getByText('Rien de ce que vous avez noté n’est perdu.')).toBeTruthy();
    expect(screen.getByText('Réessayer')).toBeTruthy();
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
