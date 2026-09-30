import i18n from '@/i18n';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { SEEDED_NAME_KEYS, displayCategoryName } from '@/i18n/categoryNames';

describe('displayCategoryName', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates a seeded parent category into French', async () => {
    await i18n.changeLanguage('fr');
    expect(displayCategoryName('Food')).toBe('Alimentation');
  });

  it('translates a seeded subcategory into French', async () => {
    await i18n.changeLanguage('fr');
    expect(displayCategoryName('Public Transport')).toBe('Transports en commun');
  });

  it('keeps seeded names as-is in English', () => {
    expect(displayCategoryName('Groceries')).toBe('Groceries');
  });

  it('shows a user-created category verbatim in any language', async () => {
    await i18n.changeLanguage('fr');
    expect(displayCategoryName('Gym membership')).toBe('Gym membership');
  });

  it('keeps a user category that shares a seeded name ("Courses") as typed', async () => {
    await i18n.changeLanguage('fr');
    expect(displayCategoryName('Courses', false)).toBe('Courses');
    // The seeded Education subcategory of the same name is still translated.
    expect(displayCategoryName('Courses', true)).toBe('Formations');
  });

  it('maps exactly the categories migration 001 seeds', () => {
    const seeded = DEFAULT_CATEGORIES.flatMap((c) => [c.name, ...c.subcategories]);
    expect(Object.keys(SEEDED_NAME_KEYS).sort()).toEqual([...seeded].sort());
  });
});
