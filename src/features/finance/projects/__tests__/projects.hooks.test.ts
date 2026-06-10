import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { Project, ProjectTransaction } from '@/features/finance/projects/projects.types';

// Keep the pure timeline math real; mock only the DB-backed functions.
jest.mock('@/features/finance/projects/projects.service', () => ({
  ...jest.requireActual<object>('@/features/finance/projects/projects.service'),
  getProjects: jest.fn(),
  getProjectById: jest.fn(),
  getProjectTransactions: jest.fn(),
  reorderPriority: jest.fn(),
  setStatus: jest.fn(),
  contributeManually: jest.fn(),
}));

jest.mock('@/features/finance/budget/budget.service', () => ({
  getMonthlyBudget: jest.fn(),
}));

import { useProjectDetail, useProjects } from '@/features/finance/projects/projects.hooks';
import * as projectsService from '@/features/finance/projects/projects.service';
import * as budgetService from '@/features/finance/budget/budget.service';

const mockedGetProjects = projectsService.getProjects as jest.MockedFunction<
  typeof projectsService.getProjects
>;
const mockedGetById = projectsService.getProjectById as jest.MockedFunction<
  typeof projectsService.getProjectById
>;
const mockedGetTxns = projectsService.getProjectTransactions as jest.MockedFunction<
  typeof projectsService.getProjectTransactions
>;
const mockedReorder = projectsService.reorderPriority as jest.MockedFunction<
  typeof projectsService.reorderPriority
>;
const mockedContribute = projectsService.contributeManually as jest.MockedFunction<
  typeof projectsService.contributeManually
>;
const mockedGetBudget = budgetService.getMonthlyBudget as jest.MockedFunction<
  typeof budgetService.getMonthlyBudget
>;

const BRVM: Project = {
  id: 1,
  name: 'BRVM Investment',
  targetAmount: 200000,
  fundedAmount: 100000,
  priorityRank: 1,
  deadline: null,
  status: 'active',
  createdAt: '2026-06-01T00:00:00.000Z',
};
const TXN: ProjectTransaction = {
  id: 1,
  projectId: 1,
  amount: 100000,
  date: '2026-06-02',
  source: 'allocation',
  createdAt: '2026-06-02T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetProjects.mockResolvedValue([BRVM]);
  mockedGetById.mockResolvedValue(BRVM);
  mockedGetTxns.mockResolvedValue([TXN]);
  mockedReorder.mockResolvedValue(undefined);
  mockedContribute.mockResolvedValue(undefined);
  // @ts-expect-error — partial MonthlyBudget; the hook only reads breakdown.projects.
  mockedGetBudget.mockResolvedValue({ breakdown: { projects: 25000 } });
});

describe('useProjects', () => {
  it('loads projects and derives a timeline from the monthly project rate', async () => {
    const { result } = renderHook(() => useProjects('2026-06'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.projects).toEqual([BRVM]);
    // remaining 100000 at 25000/month → 4 months.
    expect(result.current.timelines[0].monthsRemaining).toBe(4);
  });

  it('reorder calls the service then re-fetches', async () => {
    const { result } = renderHook(() => useProjects('2026-06'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.reorder([1]);
    });
    expect(mockedReorder).toHaveBeenCalledWith([1]);
    expect(mockedGetProjects).toHaveBeenCalledTimes(2);
  });
});

describe('useProjectDetail', () => {
  it('loads the project and its transactions', async () => {
    const { result } = renderHook(() => useProjectDetail(1));

    await waitFor(() => expect(result.current.project).not.toBeNull());
    expect(result.current.transactions).toEqual([TXN]);
    expect(mockedGetById).toHaveBeenCalledWith(1);
  });

  it('contribute calls the service then re-fetches', async () => {
    const { result } = renderHook(() => useProjectDetail(1));
    await waitFor(() => expect(result.current.project).not.toBeNull());

    await act(async () => {
      await result.current.contribute(30000);
    });
    expect(mockedContribute).toHaveBeenCalledWith(1, 30000);
    expect(mockedGetById).toHaveBeenCalledTimes(2);
  });
});
