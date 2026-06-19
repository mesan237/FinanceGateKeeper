/**
 * Emoji for each seeded default parent category, keyed by name. Name is the
 * stable key: a category's row id drifts after the dedupe heal (migration 015),
 * manual edits, or any reseed, so icons must never be looked up by id.
 */
export const CATEGORY_ICON_BY_NAME: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Bills: '💡',
  Health: '💊',
  Entertainment: '🎬',
  Education: '📚',
  Shopping: '🛍️',
  Housing: '🏠',
  Communication: '📞',
  'Gifts & Help': '🎁',
  Other: '📦',
};

export const INCOME_SOURCE_ICON_MAP: Record<string, string> = {
  salary: '💼',
  freelance: '💻',
  ecommerce: '🏪',
};

export const AVATAR_PALETTE = [
  '#E57373', // red
  '#81C784', // green
  '#64B5F6', // blue
  '#FFD54F', // amber
  '#BA68C8', // purple
  '#4DB6AC', // teal
  '#FF8A65', // deep orange
  '#A1887F', // brown
];

/**
 * Returns the emoji for a transaction row, or null if no emoji is mapped for
 * the given category name / income source (signals the caller to render a
 * letter avatar instead). Expenses resolve by the parent category name, not by
 * row id — see {@link CATEGORY_ICON_BY_NAME}.
 */
export function getTransactionIcon(
  type: 'expense' | 'income',
  categoryName?: string,
  source?: string,
): string | null {
  if (type === 'income' && source) {
    return INCOME_SOURCE_ICON_MAP[source] ?? null;
  }
  if (type === 'expense' && categoryName) {
    return CATEGORY_ICON_BY_NAME[categoryName] ?? null;
  }
  return null;
}

/** Returns a deterministic background color and first-letter string for a custom category. */
export function getCategoryAvatar(name: string): { color: string; letter: string } {
  const color = AVATAR_PALETTE[name.length % AVATAR_PALETTE.length];
  return { color, letter: name.charAt(0).toUpperCase() };
}
