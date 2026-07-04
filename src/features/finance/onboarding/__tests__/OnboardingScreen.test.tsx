import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { OnboardingScreen } from '@/features/finance/onboarding/OnboardingScreen';

describe('OnboardingScreen', () => {
  it('shows the first panel initially', () => {
    render(<OnboardingScreen onDone={jest.fn()} />);
    expect(screen.getByText('Track every franc')).toBeTruthy();
  });

  it('advances to the next panel when Next is pressed', () => {
    render(<OnboardingScreen onDone={jest.fn()} />);
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(screen.getByText('Income splits itself')).toBeTruthy();
  });

  it('calls onDone once the final panel CTA is pressed', () => {
    const onDone = jest.fn();
    render(<OnboardingScreen onDone={onDone} />);
    // Four panels: advance three times to the last, then the fourth press finishes.
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('calls onDone when Skip is pressed', () => {
    const onDone = jest.fn();
    render(<OnboardingScreen onDone={onDone} />);
    fireEvent.press(screen.getByTestId('onboarding-skip'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('hides Skip on the last panel', () => {
    render(<OnboardingScreen onDone={jest.fn()} />);
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(screen.queryByTestId('onboarding-skip')).toBeNull();
  });
});
