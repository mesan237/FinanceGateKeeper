import type {
  TontineCycle,
  TontineDetail,
  TontineSummary,
  TontineWithSummary,
} from '@/features/finance/tontines/tontines.types';

/** A weekly five-member tontine, turn 3, with cycle 1 paid and cycle 2 overdue (today 2026-10-18). */
export const SUMMARY: TontineSummary = {
  payoutAmount: 50_000,
  payoutDate: '2026-10-19',
  payout: null,
  paidCount: 1,
  paidIn: 10_000,
  received: 0,
  position: 10_000,
  remainingCount: 4,
  remainingAmount: 40_000,
  overdueCount: 1,
  nextDue: null,
  isFinished: false,
};

/** One list entry, with overrides. */
export function tontine(
  overrides: Partial<TontineWithSummary> = {},
  summary: Partial<TontineSummary> = {},
): TontineWithSummary {
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
    summary: { ...SUMMARY, ...summary },
    ...overrides,
  };
}

const CYCLES: TontineCycle[] = [
  {
    cycle: 1,
    dueDate: '2026-10-05',
    status: 'paid',
    payment: { id: 11, tontineId: 1, kind: 'contribution', cycle: 1, amount: 10_000, accountId: 1, date: '2026-10-05' },
    isPayoutTurn: false,
  },
  { cycle: 2, dueDate: '2026-10-12', status: 'overdue', payment: null, isPayoutTurn: false },
  { cycle: 3, dueDate: '2026-10-19', status: 'due', payment: null, isPayoutTurn: true },
  { cycle: 4, dueDate: '2026-10-26', status: 'upcoming', payment: null, isPayoutTurn: false },
  { cycle: 5, dueDate: '2026-11-02', status: 'upcoming', payment: null, isPayoutTurn: false },
];

/** The same tontine with its schedule. */
export function detail(overrides: Partial<TontineDetail> = {}): TontineDetail {
  return { ...tontine(), cycles: CYCLES, ...overrides };
}

/** Two wallets, Cash the default. */
export const ACCOUNTS = [
  { id: 1, name: 'Cash', type: 'cash', purpose: 'spending', openingBalance: 0, isDefault: true, isActive: true, createdAt: '' },
  { id: 2, name: 'MTN MoMo', type: 'mobile_money', purpose: 'general', openingBalance: 0, isDefault: false, isActive: true, createdAt: '' },
] as const;
