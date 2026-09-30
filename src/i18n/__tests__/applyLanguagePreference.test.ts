import i18n, { applyLanguagePreference } from '@/i18n';

describe('applyLanguagePreference', () => {
  it('switches the UI to an explicit French override', async () => {
    await applyLanguagePreference('fr');
    expect(i18n.language).toBe('fr');
    expect(i18n.t('actions.save')).toBe('Enregistrer');
  });

  it('follows the device language when the override is cleared', async () => {
    await applyLanguagePreference('fr');
    // The Jest device reports en-US.
    await applyLanguagePreference(null);
    expect(i18n.language).toBe('en');
  });
});
