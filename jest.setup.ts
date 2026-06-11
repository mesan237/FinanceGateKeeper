import { expect } from '@jest/globals';
import * as matchers from '@testing-library/react-native/matchers';

expect.extend(matchers as never);

// Jest does not load `.env`, so seed the Supabase env vars the real `supabase.ts`
// guards on at import time. Tests run against the manual `@supabase/supabase-js`
// mock, so these values are never used to reach a real network endpoint.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
