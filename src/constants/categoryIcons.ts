import { DEFAULT_CATEGORIES } from '@/constants/categories';

const CATEGORY_ICON_BY_NAME: Record<string, string> = {
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

/**
 * Derives the id→icon map from DEFAULT_CATEGORIES so it stays in sync if the
 * seed list ever changes. IDs are assigned by migration 001 in insertion order:
 * each parent takes one row, then its subcategories follow. The parent id is
 * therefore `1 + sum of (1 + subcategory-count) for all preceding entries`.
 */
function buildCategoryIconMap(): Record<number, string> {
  const map: Record<number, string> = {};
  let nextId = 1;
  for (const cat of DEFAULT_CATEGORIES) {
    const icon = CATEGORY_ICON_BY_NAME[cat.name];
    if (icon) map[nextId] = icon;
    nextId += 1 + cat.subcategories.length;
  }
  return map;
}

export const CATEGORY_ICON_MAP: Record<number, string> = buildCategoryIconMap();

const AVATAR_PALETTE = [
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
 * the given id/source (signals the caller to render a letter avatar instead).
 */
export function getTransactionIcon(
  type: 'expense' | 'income',
  categoryId?: number,
  source?: string,
): string | null {
  if (type === 'income' && source) {
    return INCOME_SOURCE_ICON_MAP[source] ?? null;
  }
  if (type === 'expense' && categoryId != null) {
    return CATEGORY_ICON_MAP[categoryId] ?? null;
  }
  return null;
}

/** Returns a deterministic background color and first-letter string for a custom category. */
export function getCategoryAvatar(name: string): { color: string; letter: string } {
  const color = AVATAR_PALETTE[name.length % AVATAR_PALETTE.length];
  return { color, letter: name.charAt(0).toUpperCase() };
}
