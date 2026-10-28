import { pinGateView } from '@/features/finance/auth/auth.gate';

describe('pinGateView', () => {
  it('waits while the lock state is unresolved', () => {
    expect(pinGateView({ ready: false, pinState: 'unset', setUpComplete: false })).toBe('wait');
  });

  it('lets a first run through the set-up before asking for a PIN', () => {
    expect(pinGateView({ ready: true, pinState: 'unset', setUpComplete: false })).toBe('app');
  });

  it('asks to create the PIN once the set-up is done', () => {
    expect(pinGateView({ ready: true, pinState: 'unset', setUpComplete: true })).toBe('lock');
  });

  it('waits on a first run until the set-up flag has loaded', () => {
    expect(pinGateView({ ready: true, pinState: 'unset', setUpComplete: undefined })).toBe('wait');
  });

  it('locks before the set-up when a PIN already exists', () => {
    expect(pinGateView({ ready: true, pinState: 'locked', setUpComplete: false })).toBe('lock');
    expect(pinGateView({ ready: true, pinState: 'locked', setUpComplete: undefined })).toBe('lock');
  });

  it('opens the app once unlocked', () => {
    expect(pinGateView({ ready: true, pinState: 'unlocked', setUpComplete: true })).toBe('app');
  });
});
