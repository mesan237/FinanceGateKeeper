import { expect } from '@jest/globals';
import * as matchers from '@testing-library/react-native/matchers';

expect.extend(matchers as never);

// Reanimated's worklet runtime can't run under the test renderer; its bundled
// mock renders Animated.View as a plain View and no-ops shared values/animations.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Lucide icons render react-native-svg trees that are slow and noisy under the
// test renderer. Stub every named export with a lightweight View that surfaces
// the icon name, so component tests can assert presence without rendering SVG.
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, name: string) => {
        if (name === '__esModule') return true;
        const Stub = ({ testID, accessibilityLabel }: { testID?: string; accessibilityLabel?: string }) =>
          React.createElement(View, { testID, accessibilityLabel, accessibilityRole: 'image' });
        Stub.displayName = String(name);
        return Stub;
      },
    },
  );
});

// The native date picker can't mount in jsdom; expose a stub that forwards its
// props (notably `onChange` and `testID`) so tests can simulate a selection.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Picker = (props: { testID?: string }) =>
    React.createElement(View, { testID: props.testID ?? 'date-time-picker', ...props });
  return { __esModule: true, default: Picker };
});

// Jest does not load `.env`, so seed the Supabase env vars the real `supabase.ts`
// guards on at import time. Tests run against the manual `@supabase/supabase-js`
// mock, so these values are never used to reach a real network endpoint.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
