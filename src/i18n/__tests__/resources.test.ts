import { resources } from '@/i18n/resources';

/** Flattens a nested resource object into its dotted leaf keys. */
function leafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('translation resources', () => {
  it('ships the same namespaces in French and English', () => {
    expect(Object.keys(resources.fr).sort()).toEqual(Object.keys(resources.en).sort());
  });

  it('translates every English key into French, with no extras', () => {
    expect(leafKeys(resources.fr).sort()).toEqual(leafKeys(resources.en).sort());
  });

  it('has no empty French strings', () => {
    const empty = leafKeys(resources.fr).filter((path) => {
      const leaf = path.split('.').reduce<unknown>(
        (node, key) => (node as Record<string, unknown>)[key],
        resources.fr,
      );
      return typeof leaf === 'string' && leaf.trim() === '';
    });
    expect(empty).toEqual([]);
  });
});
