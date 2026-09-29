import i18n from '@/i18n';
import { displayCategoryName } from '@/i18n/categoryNames';

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
});
