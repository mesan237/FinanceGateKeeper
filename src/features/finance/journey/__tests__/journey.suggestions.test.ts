import { cutSuggestions } from '@/features/finance/journey/journey.suggestions';
import type { ProfileCategory } from '@/features/finance/reports/reports.types';

const cat = (categoryId: number, categoryLabel: string, average: number, lowest: number): ProfileCategory => ({
  categoryId,
  categoryLabel,
  average,
  lowest,
  highest: average + (average - lowest),
});

describe('cutSuggestions (UX-25)', () => {
  it('suggests matching each category\'s cheapest month, the biggest saving first', () => {
    expect(
      cutSuggestions([cat(1, 'Food', 62_000, 48_000), cat(5, 'Transport', 30_000, 12_000), cat(7, 'Leisure', 15_000, 9_000)]),
    ).toEqual([
      { categoryId: 5, categoryLabel: 'Transport', average: 30_000, lowest: 12_000, frees: 18_000 },
      { categoryId: 1, categoryLabel: 'Food', average: 62_000, lowest: 48_000, frees: 14_000 },
      { categoryId: 7, categoryLabel: 'Leisure', average: 15_000, lowest: 9_000, frees: 6_000 },
    ]);
  });

  it('keeps the three biggest', () => {
    const many = [1, 2, 3, 4, 5].map((id) => cat(id, `C${id}`, 10_000 * id, 5_000 * id));
    expect(cutSuggestions(many).map((s) => s.categoryId)).toEqual([5, 4, 3]);
  });

  it('rounds what a cut frees down to 500 FCFA, so it never promises too much', () => {
    expect(cutSuggestions([cat(1, 'Food', 41_667, 30_000)])[0].frees).toBe(11_500);
  });

  it('leaves out a category that never varied, or only by a few francs', () => {
    expect(cutSuggestions([cat(1, 'Food', 40_000, 40_000), cat(2, 'Bread', 3_200, 3_000)])).toEqual([]);
  });
});
