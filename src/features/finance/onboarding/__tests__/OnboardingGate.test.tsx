import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { OnboardingGate } from '@/features/finance/onboarding/OnboardingGate';

const Child = () => <Text>app-tree</Text>;

/** What the routing layer injects: completion, the reminder step and the wallets step. */
const STEPS = {
  onDone: jest.fn(),
  onReminder: jest.fn().mockResolvedValue(true),
  renderWallets: () => null,
  language: 'en' as const,
  onLanguage: jest.fn(),
};

describe('OnboardingGate', () => {
  it('renders nothing until ready', () => {
    render(
      <OnboardingGate ready={false} complete={false} {...STEPS}>
        <Child />
      </OnboardingGate>,
    );
    expect(screen.queryByText('app-tree')).toBeNull();
    expect(screen.queryByTestId('onboarding-screen')).toBeNull();
  });

  it('shows the set-up when onboarding is incomplete', () => {
    render(
      <OnboardingGate ready complete={false} {...STEPS}>
        <Child />
      </OnboardingGate>,
    );
    expect(screen.getByTestId('onboarding-screen')).toBeTruthy();
    expect(screen.queryByText('app-tree')).toBeNull();
  });

  it('renders children once onboarding is complete', () => {
    render(
      <OnboardingGate ready complete {...STEPS}>
        <Child />
      </OnboardingGate>,
    );
    expect(screen.getByText('app-tree')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-screen')).toBeNull();
  });
});
