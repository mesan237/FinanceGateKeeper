import { formatCurrency } from '@/utils/formatCurrency';

const NBSP = ' ';

describe('formatCurrency', () => {
  it('formats zero as "0 FCFA"', () => {
    expect(formatCurrency(0)).toBe(`0${NBSP}FCFA`);
  });

  it('formats a four-digit amount with NBSP thousands separator', () => {
    expect(formatCurrency(1500)).toBe(`1${NBSP}500${NBSP}FCFA`);
  });

  it('formats a seven-digit amount with multiple NBSP separators', () => {
    expect(formatCurrency(1234567)).toBe(`1${NBSP}234${NBSP}567${NBSP}FCFA`);
  });

  it('preserves a leading minus on negative amounts', () => {
    expect(formatCurrency(-2500)).toBe(`-2${NBSP}500${NBSP}FCFA`);
  });

  it('rounds a fractional amount to the nearest integer before formatting', () => {
    expect(formatCurrency(1500.4)).toBe(`1${NBSP}500${NBSP}FCFA`);
    expect(formatCurrency(1500.6)).toBe(`1${NBSP}501${NBSP}FCFA`);
  });
});
