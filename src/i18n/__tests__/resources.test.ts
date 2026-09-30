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

  it('uses the same {{placeholders}} in French as in English', () => {
    const leafAt = (tree: unknown, path: string): unknown =>
      path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], tree);
    const placeholders = (value: unknown): string[] =>
      typeof value === 'string' ? [...value.matchAll(/{{(\w+)}}/g)].map((m) => m[1]).sort() : [];
    const mismatched = leafKeys(resources.en).filter(
      (path) =>
        placeholders(leafAt(resources.en, path)).join() !==
        placeholders(leafAt(resources.fr, path)).join(),
    );
    expect(mismatched).toEqual([]);
  });
});
