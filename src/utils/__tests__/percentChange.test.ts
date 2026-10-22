import { percentChange } from '@/utils/percentChange';

describe('percentChange', () => {
  it('is the whole-percent change from the reference figure', () => {
    expect(percentChange(90_000, 60_000)).toBe(50);
    expect(percentChange(45_000, 60_000)).toBe(-25);
  });

  it('has no percentage against nothing', () => {
    expect(percentChange(5_000, 0)).toBeNull();
    expect(percentChange(5_000, null)).toBeNull();
  });
});
