import { act } from '@testing-library/react-native';

import { isIncomeSourceKey, labelForIncomeSource } from '@/constants/incomeSources';
import i18n from '@/i18n';

describe('labelForIncomeSource', () => {
  it('names a built-in source by its key in the active language', async () => {
    expect(labelForIncomeSource('gift', 'Gift & family support')).toBe('Gift & family support');
    expect(labelForIncomeSource('ecommerce', 'E-commerce')).toBe('E-commerce');

    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    expect(labelForIncomeSource('salary', 'Salary')).toBe('Salaire');
    expect(labelForIncomeSource('business', 'Business')).toBe('Activité / commerce');
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('shows a source the user made by its own name', () => {
    expect(labelForIncomeSource(null, 'Rent from the shop')).toBe('Rent from the shop');
  });

  it('falls back to the stored name for an unknown key', () => {
    expect(labelForIncomeSource('lottery', 'Lottery')).toBe('Lottery');
  });
});

describe('isIncomeSourceKey', () => {
  it('knows the six built-in keys and nothing else', () => {
    for (const key of ['salary', 'freelance', 'business', 'gift', 'other', 'ecommerce']) {
      expect(isIncomeSourceKey(key)).toBe(true);
    }
    expect(isIncomeSourceKey('Salary')).toBe(false);
  });
});
