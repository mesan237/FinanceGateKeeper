import {
  CATEGORY_ICON_BY_NAME,
  getCategoryAvatar,
  getTransactionIcon,
} from '@/constants/categoryIcons';

describe('getTransactionIcon', () => {
  it('returns the correct emoji for a known default category name', () => {
    expect(getTransactionIcon('expense', 'Food')).toBe('🍔');
  });

  it('resolves by name regardless of the underlying database id', () => {
    // The icon must not depend on a category's row id (which drifts after the
    // dedupe heal / manual edits). Name is the stable key.
    expect(getTransactionIcon('expense', 'Transport')).toBe('🚗');
    expect(getTransactionIcon('expense', 'Shopping')).toBe('🛍️');
  });

  it('returns 💼 for income source "salary"', () => {
    expect(getTransactionIcon('income', undefined, 'salary')).toBe('💼');
  });

  it('returns 💻 for income source "freelance"', () => {
    expect(getTransactionIcon('income', undefined, 'freelance')).toBe('💻');
  });

  it('returns 🏪 for income source "ecommerce"', () => {
    expect(getTransactionIcon('income', undefined, 'ecommerce')).toBe('🏪');
  });

  it('returns null for an unknown category name (signals fallback to avatar)', () => {
    expect(getTransactionIcon('expense', 'Zap')).toBeNull();
  });

  it('returns null when no category name and no source are given', () => {
    expect(getTransactionIcon('expense')).toBeNull();
  });
});

describe('getCategoryAvatar', () => {
  it('returns the first letter of the name uppercased', () => {
    const avatar = getCategoryAvatar('Food');
    expect(avatar.letter).toBe('F');
  });

  it('returns a non-empty color string', () => {
    const avatar = getCategoryAvatar('Food');
    expect(typeof avatar.color).toBe('string');
    expect(avatar.color.length).toBeGreaterThan(0);
  });

  it('is deterministic — same name always gets the same color', () => {
    expect(getCategoryAvatar('Food').color).toBe(getCategoryAvatar('Food').color);
  });

  it('maps palette slot by name length — two names with equal length get the same color', () => {
    const a = getCategoryAvatar('AB');
    const b = getCategoryAvatar('XY');
    expect(a.color).toBe(b.color);
  });
});

describe('CATEGORY_ICON_BY_NAME', () => {
  it('maps every seeded default parent category name to an emoji', () => {
    for (const name of ['Food', 'Transport', 'Bills', 'Health', 'Shopping', 'Other']) {
      expect(CATEGORY_ICON_BY_NAME[name]).toBeTruthy();
    }
  });
});
