import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { OnboardingGate } from '@/features/finance/onboarding/OnboardingGate';

const Child = () => <Text>app-tree</Text>;

describe('OnboardingGate', () => {
  it('renders nothing until ready', () => {
    render(
      <OnboardingGate ready={false} complete={false} onDone={jest.fn()}>
        <Child />
      </OnboardingGate>,
    );
    expect(screen.queryByText('app-tree')).toBeNull();
    expect(screen.queryByTestId('onboarding-screen')).toBeNull();
  });

  it('shows the carousel when onboarding is incomplete', () => {
    render(
      <OnboardingGate ready complete={false} onDone={jest.fn()}>
        <Child />
      </OnboardingGate>,
    );
    expect(screen.getByTestId('onboarding-screen')).toBeTruthy();
    expect(screen.queryByText('app-tree')).toBeNull();
  });

  it('renders children once onboarding is complete', () => {
    render(
      <OnboardingGate ready complete onDone={jest.fn()}>
        <Child />
      </OnboardingGate>,
    );
    expect(screen.getByText('app-tree')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-screen')).toBeNull();
  });
});
