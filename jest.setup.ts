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

// Safe-area insets require a native provider that doesn't exist under Jest.
// Return zero insets and a full-frame so components using `useSafeAreaInsets`
// (e.g. `BottomSheet`) render without a wrapping `<SafeAreaProvider>`.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 0, height: 0 };
  // Forward props (notably `testID`/`style`) so `SafeAreaView`-wrapped screens
  // stay queryable, exactly as the real component renders a View.
  const Passthrough = (props: Record<string, unknown>) => React.createElement(View, props);
  return {
    SafeAreaProvider: Passthrough,
    SafeAreaConsumer: ({ children }: { children: (i: typeof inset) => React.ReactNode }) =>
      children(inset),
    SafeAreaView: Passthrough,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets: inset, frame },
  };
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

// expo-crypto wraps native digest/RNG that don't exist under Jest. The mock is
// deterministic: `digestStringAsync` folds the input into a stable hex string
// (same input ⇒ same digest, different input ⇒ different digest) so PIN hash
// verification can be tested, and `getRandomBytesAsync` returns fresh bytes per
// call so generated salts vary.
jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_algorithm: string, data: string) => {
      let h1 = 0x811c9dc5;
      let h2 = 0x1000193;
      for (let i = 0; i < data.length; i += 1) {
        const c = data.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
        h2 = Math.imul(h2 + c + i, 0x85ebca6b) >>> 0;
      }
      return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(4);
    },
    getRandomBytesAsync: async (byteCount: number) => {
      const out = new Uint8Array(byteCount);
      for (let i = 0; i < byteCount; i += 1) {
        counter = (counter + 1) % 256;
        out[i] = (counter * 31 + i) % 256;
      }
      return out;
    },
  };
});

// expo-file-system's "new" API (`File`/`Directory`/`Paths`) wraps native disk
// I/O that doesn't exist under Jest. The mock backs every file with an
// in-memory string keyed by its joined uri, matching the real
// create()-then-write() contract (write() throws if create() was never called).
jest.mock('expo-file-system', () => {
  const store = new Map<string, string>();
  class MockFile {
    uri: string;
    constructor(...uris: Array<string | { uri: string }>) {
      this.uri = uris.map((u) => (typeof u === 'string' ? u : u.uri)).join('/');
    }
    create(options?: { overwrite?: boolean }) {
      if (store.has(this.uri) && !options?.overwrite) {
        throw new Error(`File already exists: ${this.uri}`);
      }
      store.set(this.uri, '');
    }
    write(content: string) {
      if (!store.has(this.uri)) throw new Error(`File not created: ${this.uri}`);
      store.set(this.uri, content);
    }
    async text() {
      const content = store.get(this.uri);
      if (content === undefined) throw new Error(`File not found: ${this.uri}`);
      return content;
    }
    get exists() {
      return store.has(this.uri);
    }
  }
  class MockDirectory {
    uri: string;
    constructor(...uris: Array<string | { uri: string }>) {
      this.uri = uris.map((u) => (typeof u === 'string' ? u : u.uri)).join('/');
    }
  }
  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { cache: new MockDirectory('mock-cache-dir') },
  };
});

// expo-sharing opens a native OS share sheet that doesn't exist under Jest.
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

// expo-document-picker opens a native file picker that doesn't exist under
// Jest. Tests override this per-case via `(getDocumentAsync as jest.Mock)`.
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true, assets: null }),
}));

// Jest does not load `.env`, so seed the Supabase env vars the real `supabase.ts`
// guards on at import time. Tests run against the manual `@supabase/supabase-js`
// mock, so these values are never used to reach a real network endpoint.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
