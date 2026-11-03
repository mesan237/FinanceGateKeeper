import { appendOperator, evaluateAmount, formatExpression } from '@/utils/amountExpression';

describe('evaluateAmount (VS-93)', () => {
  it('reads a plain amount as itself, not as a calculation', () => {
    expect(evaluateAmount('1500')).toEqual({ total: 1500, isCalculation: false, rounded: false });
  });

  it('adds and subtracts', () => {
    expect(evaluateAmount('350+200+150').total).toBe(700);
    expect(evaluateAmount('5000−1200').total).toBe(3800);
  });

  it('multiplies and divides before adding, as on a calculator', () => {
    // Two taxi rides and a moto.
    expect(evaluateAmount('350×2+200')).toEqual({ total: 900, isCalculation: true, rounded: false });
    expect(evaluateAmount('200+3000÷2').total).toBe(1700);
  });

  it('accepts the signs a phone keyboard types: x, *, / and -', () => {
    expect(evaluateAmount('350x2').total).toBe(700);
    expect(evaluateAmount('350*2').total).toBe(700);
    expect(evaluateAmount('1000/4').total).toBe(250);
    expect(evaluateAmount('1000-1').total).toBe(999);
  });

  it('rounds to whole FCFA and says it did', () => {
    expect(evaluateAmount('1000÷3')).toEqual({ total: 333, isCalculation: true, rounded: true });
  });

  it('ignores an operator still waiting for its number', () => {
    expect(evaluateAmount('500+').total).toBe(500);
  });

  it('ignores digit-group spaces', () => {
    expect(evaluateAmount('1 500 + 2 000').total).toBe(3500);
  });

  it('has no total for nothing, zero, a negative result or a division by zero', () => {
    expect(evaluateAmount('').total).toBeNull();
    expect(evaluateAmount('0').total).toBeNull();
    expect(evaluateAmount('200−500').total).toBeNull();
    expect(evaluateAmount('500÷0').total).toBeNull();
  });
});

describe('formatExpression (VS-93)', () => {
  it('groups each number and spaces the operators', () => {
    expect(formatExpression('1500x2+200')).toBe('1 500 × 2 + 200');
  });

  it('drops anything that is not a digit or an operator', () => {
    expect(formatExpression('12 a3b4')).toBe('1 234');
  });

  it('keeps one operator between numbers and none at the start', () => {
    expect(formatExpression('+500++200')).toBe('500 + 200');
  });
});

describe('appendOperator (VS-93)', () => {
  it('adds an operator after a number', () => {
    expect(appendOperator('350', '×')).toBe('350 ×');
  });

  it('replaces an operator that has no number after it yet', () => {
    expect(appendOperator('350 ×', '+')).toBe('350 +');
  });

  it('does nothing before the first number', () => {
    expect(appendOperator('', '+')).toBe('');
  });
});
