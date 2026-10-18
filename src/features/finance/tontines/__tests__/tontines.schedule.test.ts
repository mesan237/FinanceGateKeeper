import { buildCycles, cycleDate, summarise } from '@/features/finance/tontines/tontines.schedule';
import type { Tontine, TontinePayment } from '@/features/finance/tontines/tontines.types';

const TODAY = '2026-10-18';

function tontine(overrides: Partial<Tontine> = {}): Tontine {
  return {
    id: 1,
    name: 'Njangi',
    contributionAmount: 10_000,
    frequency: 'weekly',
    startDate: '2026-10-05',
    members: 5,
    payoutTurn: 3,
    accountId: 1,
    createdAt: '2026-10-01T08:00:00Z',
    ...overrides,
  };
}

function paid(cycle: number, kind: TontinePayment['kind'] = 'contribution', amount = 10_000): TontinePayment {
  return { id: cycle + (kind === 'payout' ? 100 : 0), tontineId: 1, kind, cycle, amount, accountId: 1, date: TODAY };
}

describe('cycleDate', () => {
  it('steps a weekly tontine seven days a cycle', () => {
    expect(cycleDate('2026-10-05', 'weekly', 1)).toBe('2026-10-05');
    expect(cycleDate('2026-10-05', 'weekly', 4)).toBe('2026-10-26');
  });

  it('keeps a monthly tontine on its day, clamped in short months', () => {
    expect(cycleDate('2026-01-31', 'monthly', 2)).toBe('2026-02-28');
    expect(cycleDate('2026-01-31', 'monthly', 3)).toBe('2026-03-31');
    expect(cycleDate('2026-11-15', 'monthly', 3)).toBe('2027-01-15');
  });
});

describe('buildCycles', () => {
  it('lays out one cycle per member with its status', () => {
    const cycles = buildCycles(tontine(), [paid(1)], TODAY);

    expect(cycles.map((c) => [c.cycle, c.dueDate, c.status])).toEqual([
      [1, '2026-10-05', 'paid'],
      [2, '2026-10-12', 'overdue'],
      [3, '2026-10-19', 'due'],
      [4, '2026-10-26', 'upcoming'],
      [5, '2026-11-02', 'upcoming'],
    ]);
  });

  it('marks the payout turn', () => {
    const cycles = buildCycles(tontine(), [], TODAY);

    expect(cycles.filter((c) => c.isPayoutTurn).map((c) => c.cycle)).toEqual([3]);
  });

  it('has no payout turn while the draw is pending', () => {
    expect(buildCycles(tontine({ payoutTurn: null }), [], TODAY).some((c) => c.isPayoutTurn)).toBe(false);
  });
});

describe('summarise', () => {
  it('says the user is ahead before the payout: paid in, nothing received yet', () => {
    const t = tontine();
    const payments = [paid(1), paid(2)];
    const s = summarise(t, buildCycles(t, payments, TODAY), payments);

    expect(s.payoutAmount).toBe(50_000);
    expect(s.payoutDate).toBe('2026-10-19');
    expect(s.paidIn).toBe(20_000);
    expect(s.received).toBe(0);
    expect(s.position).toBe(20_000);
    expect(s.remainingCount).toBe(3);
    expect(s.remainingAmount).toBe(30_000);
    expect(s.overdueCount).toBe(0);
    expect(s.nextDue?.cycle).toBe(3);
    expect(s.isFinished).toBe(false);
  });

  it('says the user is behind after the payout: what is still owed', () => {
    const t = tontine({ payoutTurn: 1 });
    const payments = [paid(1), paid(1, 'payout', 50_000)];
    const s = summarise(t, buildCycles(t, payments, TODAY), payments);

    expect(s.received).toBe(50_000);
    expect(s.position).toBe(-40_000);
    expect(s.overdueCount).toBe(1);
    expect(s.payout?.amount).toBe(50_000);
  });

  it('has no payout date while the turn is unknown', () => {
    const t = tontine({ payoutTurn: null });
    const s = summarise(t, buildCycles(t, [], TODAY), []);

    expect(s.payoutDate).toBeNull();
  });

  it('is finished once every contribution is paid and the payout received', () => {
    const t = tontine({ members: 2, payoutTurn: 2 });
    const payments = [paid(1), paid(2), paid(2, 'payout', 20_000)];
    const s = summarise(t, buildCycles(t, payments, TODAY), payments);

    expect(s.isFinished).toBe(true);
    expect(s.position).toBe(0);
    expect(s.nextDue).toBeNull();
  });
});
