import { buildInstalments, instalmentAmounts, loanCost } from '@/features/finance/debt/debt.terms';
import type { Debt, DebtPayment } from '@/features/finance/debt/debt.types';

const TODAY = '2026-10-21';

function debt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 1,
    personName: 'Microfinance',
    amount: 100_000,
    direction: 'owed',
    date: '2026-09-01',
    dueDate: null,
    status: 'pending',
    note: null,
    settledAt: null,
    createdAt: '2026-09-01T08:00:00Z',
    accountId: 1,
    totalToRepay: 120_000,
    schedule: { count: 6, frequency: 'monthly', firstDate: '2026-10-01' },
    repayable: 120_000,
    paid: 0,
    outstanding: 120_000,
    ...overrides,
  };
}

function payment(instalment: number, amount: number): DebtPayment {
  return {
    id: 10 + instalment,
    debtId: 1,
    amount,
    accountId: 1,
    date: '2026-10-01',
    note: null,
    createdAt: '2026-10-01T08:00:00Z',
    instalment,
  };
}

describe('instalmentAmounts', () => {
  it('splits the total into equal instalments, the last taking the remainder', () => {
    expect(instalmentAmounts(120_000, 6)).toEqual([20_000, 20_000, 20_000, 20_000, 20_000, 20_000]);
    expect(instalmentAmounts(100_000, 3)).toEqual([33_333, 33_333, 33_334]);
  });
});

describe('buildInstalments', () => {
  it('lays out each instalment with its date, amount and status', () => {
    const rows = buildInstalments(debt(), [payment(1, 20_000)], TODAY);

    expect(rows.map((r) => [r.n, r.dueDate, r.amount, r.status])).toEqual([
      [1, '2026-10-01', 20_000, 'paid'],
      [2, '2026-11-01', 20_000, 'upcoming'],
      [3, '2026-12-01', 20_000, 'upcoming'],
      [4, '2027-01-01', 20_000, 'upcoming'],
      [5, '2027-02-01', 20_000, 'upcoming'],
      [6, '2027-03-01', 20_000, 'upcoming'],
    ]);
  });

  it('marks an unpaid instalment overdue once its day passed, and due in the last days before it', () => {
    const weekly = debt({ schedule: { count: 3, frequency: 'weekly', firstDate: '2026-10-14' } });

    expect(buildInstalments(weekly, [], '2026-10-17').map((r) => r.status)).toEqual(['overdue', 'upcoming', 'upcoming']);
    expect(buildInstalments(weekly, [], '2026-10-19').map((r) => r.status)).toEqual(['overdue', 'due', 'upcoming']);
  });

  it('is empty without a schedule', () => {
    expect(buildInstalments(debt({ schedule: null }), [], TODAY)).toEqual([]);
  });
});

describe('loanCost', () => {
  it('is what is repaid on top of the amount, with an equivalent monthly rate over the term', () => {
    // 20 000 over 6 months on 100 000 (first instalment in October, last in March).
    expect(loanCost(debt())).toEqual({ cost: 20_000, monthlyRate: 3.3 });
  });

  it('uses the due date as the end of the term without a schedule', () => {
    expect(loanCost(debt({ schedule: null, dueDate: '2026-12-01' }))).toEqual({ cost: 20_000, monthlyRate: 6.7 });
  });

  it('has a cost but no rate without an end date, and neither without interest', () => {
    expect(loanCost(debt({ schedule: null }))).toEqual({ cost: 20_000, monthlyRate: null });
    expect(loanCost(debt({ totalToRepay: null, repayable: 100_000 }))).toEqual({ cost: 0, monthlyRate: null });
  });
});
