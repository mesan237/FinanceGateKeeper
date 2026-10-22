import { reasonOf, sumByReason } from '@/features/finance/expenses/expenses.reason';

const kindOf = (categoryId: number): 'fixed' | 'variable' => (categoryId === 9 ? 'fixed' : 'variable');
const base = { categoryId: 5, subcategoryId: null, isRecurring: false, isUnplanned: false, eventId: null };

describe('reasonOf — why an expense happened (VS-62)', () => {
  it('reads an expense tagged with an event as the event, whatever else it is', () => {
    expect(reasonOf({ ...base, eventId: 3, isUnplanned: true }, kindOf)).toBe('event');
  });

  it('reads an imprévu as unexpected', () => {
    expect(reasonOf({ ...base, isUnplanned: true }, kindOf)).toBe('unexpected');
  });

  it('reads a recurring bill or a fixed category as routine', () => {
    expect(reasonOf({ ...base, isRecurring: true }, kindOf)).toBe('routine');
    expect(reasonOf({ ...base, categoryId: 9 }, kindOf)).toBe('routine');
  });

  it('reads the rest as everyday spending', () => {
    expect(reasonOf(base, kindOf)).toBe('everyday');
  });
});

describe('sumByReason (VS-62)', () => {
  it('adds amounts up by reason, refunds netted and never below zero', () => {
    const totals = sumByReason(
      [
        { ...base, amount: 20_000, isRecurring: true },
        { ...base, amount: 15_000, eventId: 3 },
        { ...base, amount: -2_000, eventId: 3 },
        { ...base, amount: 3_000, isUnplanned: true },
        { ...base, amount: 7_000 },
        { ...base, amount: -9_000, isUnplanned: true },
      ],
      kindOf,
    );

    expect(totals).toEqual({ routine: 20_000, event: 13_000, unexpected: 0, everyday: 7_000 });
  });
});
