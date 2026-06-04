import { formatCurrency } from '@/utils/formatCurrency';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0 FCFA');
  });

  it('formats thousands with a space separator', () => {
    expect(formatCurrency(1500)).toBe('1 500 FCFA');
  });

  it('formats hundreds of thousands', () => {
    expect(formatCurrency(150000)).toBe('150 000 FCFA');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-2000)).toBe('-2 000 FCFA');
  });

  it('formats millions', () => {
    expect(formatCurrency(1234567)).toBe('1 234 567 FCFA');
  });

  it('truncates any fractional part (FCFA has no decimals)', () => {
    expect(formatCurrency(1500.9)).toBe('1 500 FCFA');
  });
});
