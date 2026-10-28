import i18n, { applyLanguagePreference } from '@/i18n';

describe('applyLanguagePreference', () => {
  it('switches the UI to an explicit French choice', async () => {
    await applyLanguagePreference('fr');
    expect(i18n.language).toBe('fr');
    expect(i18n.t('actions.save')).toBe('Enregistrer');
  });

  it('falls back to French when no choice is saved, even on an English device (VS-86)', async () => {
    await applyLanguagePreference('en');
    // The Jest device reports en-US.
    await applyLanguagePreference(null);
    expect(i18n.language).toBe('fr');
  });
});
