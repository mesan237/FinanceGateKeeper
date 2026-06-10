import {
  CATEGORY_ICON_MAP,
  getCategoryAvatar,
  getTransactionIcon,
} from '@/constants/categoryIcons';

// Food is always id 1 in a fresh seed (first parent inserted by migration 001).
const FOOD_ID = 1;

describe('getTransactionIcon', () => {
  it('returns the correct emoji for a known default category id', () => {
    expect(getTransactionIcon('expense', FOOD_ID)).toBe('🍔');
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

  it('returns null for an unknown category id (signals fallback to avatar)', () => {
    expect(getTransactionIcon('expense', 99999)).toBeNull();
  });

  it('returns null when no categoryId and no source are given', () => {
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

describe('CATEGORY_ICON_MAP', () => {
  it('maps at least 8 default category ids', () => {
    expect(Object.keys(CATEGORY_ICON_MAP).length).toBeGreaterThanOrEqual(8);
  });
});
