import { groupDigits } from '@/utils/groupDigits';

describe('groupDigits', () => {
  it('leaves groups of three or fewer digits unchanged', () => {
    expect(groupDigits('')).toBe('');
    expect(groupDigits('5')).toBe('5');
    expect(groupDigits('500')).toBe('500');
  });

  it('inserts a space before every group of three from the right', () => {
    expect(groupDigits('5000')).toBe('5 000');
    expect(groupDigits('50000')).toBe('50 000');
    expect(groupDigits('350000')).toBe('350 000');
    expect(groupDigits('1000000')).toBe('1 000 000');
  });
});
