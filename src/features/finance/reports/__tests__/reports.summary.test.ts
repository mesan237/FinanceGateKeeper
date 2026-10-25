import { topCategoriesShare } from '@/features/finance/reports/reports.summary';

const row = (categoryId: number, categoryLabel: string, amount: number, pct: number) => ({
  categoryId,
  categoryLabel,
  amount,
  pct,
});

describe('topCategoriesShare (UX-14)', () => {
  it('names the two biggest categories and their combined share', () => {
    expect(
      topCategoriesShare([row(1, 'Food', 62_000, 34.1), row(2, 'Transport', 44_000, 24.2), row(3, 'Bills', 30_000, 16.5)]),
    ).toEqual({ labels: ['Food', 'Transport'], sharePct: 58 });
  });

  it('ranks by amount even if the rows arrive unsorted', () => {
    expect(topCategoriesShare([row(3, 'Bills', 10_000, 20), row(1, 'Food', 40_000, 80)])).toEqual({
      labels: ['Food', 'Bills'],
      sharePct: 100,
    });
  });

  it('names one category when there is only one', () => {
    expect(topCategoriesShare([row(1, 'Food', 5_000, 100)])).toEqual({ labels: ['Food'], sharePct: 100 });
  });

  it('says nothing for a month without categories', () => {
    expect(topCategoriesShare([])).toBeNull();
  });
});
