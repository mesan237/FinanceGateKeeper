import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

// Per-test in-memory better-sqlite3; only the connection is swapped, the real
// migrations and queries run (no SQLite mocking). Mirrors funds.service.test.
const mockState: { driver: SqliteDriver | null } = { driver: null };

jest.mock('@/services/database', () => {
  const actual = jest.requireActual('@/services/database');
  return {
    ...actual,
    execute: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.execute(sql, params as never),
    query: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.query(sql, params as never),
  };
});

import {
  contributeManually,
  createProject,
  deleteProject,
  detectShift,
  estimateTimeline,
  fundProjects,
  getProjectById,
  getProjects,
  getProjectTransactions,
  reorderPriority,
  setStatus,
  updateProject,
} from '@/features/finance/projects/projects.service';

let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

async function seedTwo() {
  const brvm = await createProject({ name: 'BRVM Investment', targetAmount: 200000 });
  const ecom = await createProject({ name: 'E-commerce Launch', targetAmount: 500000 });
  return { brvm, ecom };
}

describe('createProject / getProjects', () => {
  it('appends each new project at the next priority rank', async () => {
    const { brvm, ecom } = await seedTwo();
    const projects = await getProjects();

    expect(projects.map((p) => p.id)).toEqual([brvm, ecom]);
    expect(projects[0].priorityRank).toBe(1);
    expect(projects[1].priorityRank).toBe(2);
    expect(projects[0].status).toBe('active');
    expect(projects[0].fundedAmount).toBe(0);
  });
});

describe('fundProjects (priority cascade)', () => {
  it('fully funds rank 1 before rank 2 receives anything', async () => {
    await seedTwo();
    await fundProjects(150000);

    const [brvm, ecom] = await getProjects();
    expect(brvm.fundedAmount).toBe(150000);
    expect(ecom.fundedAmount).toBe(0);
  });

  it('overflows to rank 2 once rank 1 reaches its target and completes it', async () => {
    await seedTwo();
    await fundProjects(250000); // 200000 fills BRVM, 50000 spills to E-commerce

    const [brvm, ecom] = await getProjects();
    expect(brvm.fundedAmount).toBe(200000);
    expect(brvm.status).toBe('completed');
    expect(ecom.fundedAmount).toBe(50000);
    expect(ecom.status).toBe('active');
  });

  it('skips a completed project on the next funding cycle', async () => {
    await seedTwo();
    await fundProjects(200000); // completes BRVM
    await fundProjects(100000); // should all go to E-commerce

    const [brvm, ecom] = await getProjects();
    expect(brvm.fundedAmount).toBe(200000);
    expect(ecom.fundedAmount).toBe(100000);
  });

  it('skips a paused project; funding flows to the next active one', async () => {
    const { brvm } = await seedTwo();
    await setStatus(brvm, 'paused');
    await fundProjects(100000);

    const [brvmAfter, ecom] = await getProjects();
    expect(brvmAfter.fundedAmount).toBe(0);
    expect(ecom.fundedAmount).toBe(100000);
  });

  it('records one allocation transaction per funded project', async () => {
    const { brvm, ecom } = await seedTwo();
    await fundProjects(250000, '2026-06-02');

    const brvmTxns = await getProjectTransactions(brvm);
    const ecomTxns = await getProjectTransactions(ecom);
    expect(brvmTxns).toHaveLength(1);
    expect(brvmTxns[0]).toMatchObject({ amount: 200000, source: 'allocation', date: '2026-06-02' });
    expect(ecomTxns).toHaveLength(1);
    expect(ecomTxns[0]).toMatchObject({ amount: 50000, source: 'allocation' });
  });

  it('is a no-op when there are no active projects', async () => {
    await expect(fundProjects(100000)).resolves.toBeUndefined();
  });
});

describe('reorderPriority', () => {
  it('changes which project the next funding cycle fills first', async () => {
    const { brvm, ecom } = await seedTwo();
    await reorderPriority([ecom, brvm]);

    await fundProjects(100000);
    const projectById = Object.fromEntries((await getProjects()).map((p) => [p.id, p]));
    expect(projectById[ecom].fundedAmount).toBe(100000);
    expect(projectById[brvm].fundedAmount).toBe(0);
  });
});

describe('contributeManually', () => {
  it('adds a manual contribution and records it', async () => {
    const { brvm } = await seedTwo();
    await contributeManually(brvm, 30000, '2026-06-03');

    const project = await getProjectById(brvm);
    expect(project?.fundedAmount).toBe(30000);
    const txns = await getProjectTransactions(brvm);
    expect(txns[0]).toMatchObject({ amount: 30000, source: 'manual' });
  });

  it('completes the project when a manual contribution meets the target', async () => {
    const { brvm } = await seedTwo();
    await contributeManually(brvm, 200000);
    expect((await getProjectById(brvm))?.status).toBe('completed');
  });
});

describe('updateProject', () => {
  it('updates name, target, and deadline', async () => {
    const id = await createProject({ name: 'X', targetAmount: 100000 });
    await updateProject(id, { name: 'BRVM', targetAmount: 150000, deadline: '2026-12-31' });

    const project = await getProjectById(id);
    expect(project).toMatchObject({ name: 'BRVM', targetAmount: 150000, deadline: '2026-12-31' });
  });

  it('completes a project when its target is lowered to at/below funded', async () => {
    const id = await createProject({ name: 'X', targetAmount: 200000 });
    await contributeManually(id, 120000);
    expect((await getProjectById(id))?.status).toBe('active');

    await updateProject(id, { targetAmount: 100000 });
    expect((await getProjectById(id))?.status).toBe('completed');
  });

  it('re-opens a completed project when its target is raised above funded', async () => {
    const id = await createProject({ name: 'X', targetAmount: 100000 });
    await contributeManually(id, 100000); // completes it
    expect((await getProjectById(id))?.status).toBe('completed');

    await updateProject(id, { targetAmount: 200000 });
    expect((await getProjectById(id))?.status).toBe('active');
  });

  it('rejects an empty name or non-positive target', async () => {
    const id = await createProject({ name: 'X', targetAmount: 100000 });
    await expect(updateProject(id, { name: '  ' })).rejects.toThrow();
    await expect(updateProject(id, { targetAmount: 0 })).rejects.toThrow();
  });
});

describe('deleteProject', () => {
  it('removes the project and re-packs the remaining priority ranks', async () => {
    const a = await createProject({ name: 'A', targetAmount: 100000 });
    const b = await createProject({ name: 'B', targetAmount: 100000 });
    const c = await createProject({ name: 'C', targetAmount: 100000 });

    await deleteProject(b);

    const remaining = await getProjects();
    expect(remaining.map((p) => p.id)).toEqual([a, c]);
    expect(remaining.map((p) => p.priorityRank)).toEqual([1, 2]);
  });
});

describe('estimateTimeline', () => {
  it('computes months remaining and a completion date from the monthly rate', async () => {
    await createProject({ name: 'X', targetAmount: 100000 });
    const [project] = await getProjects();

    // remaining 100000 at 25000/month → 4 months.
    const estimate = estimateTimeline(project, 25000, '2026-06-15');
    expect(estimate.monthsRemaining).toBe(4);
    expect(estimate.completionDate).toBe('2026-10-15');
  });

  it('rounds partial months up', async () => {
    await createProject({ name: 'X', targetAmount: 100000 });
    const [project] = await getProjects();
    expect(estimateTimeline(project, 30000, '2026-06-15').monthsRemaining).toBe(4); // ceil(3.33)
  });

  it('returns nulls for a zero/negative rate', async () => {
    await createProject({ name: 'X', targetAmount: 100000 });
    const [project] = await getProjects();
    expect(estimateTimeline(project, 0)).toEqual({
      projectId: project.id,
      monthsRemaining: null,
      completionDate: null,
    });
  });

  it('returns zero months for an already-funded project', async () => {
    const id = await createProject({ name: 'X', targetAmount: 100000 });
    await contributeManually(id, 100000, '2026-06-15');
    const project = await getProjectById(id);
    const estimate = estimateTimeline(project!, 25000, '2026-06-15');
    expect(estimate.monthsRemaining).toBe(0);
    expect(estimate.completionDate).toBe('2026-06-15');
  });
});

describe('detectShift', () => {
  const base = { projectId: 1, monthsRemaining: 3, completionDate: '2026-09-15' };

  it('returns a shift only when months move at/over the threshold', () => {
    const later = { projectId: 1, monthsRemaining: 4, completionDate: '2026-10-15' };
    const shift = detectShift(base, later);
    expect(shift).toMatchObject({ projectId: 1, previous: '2026-09-15', next: '2026-10-15' });
    expect(Math.abs(shift!.shiftedMonths)).toBeGreaterThanOrEqual(1);
  });

  it('returns null when the estimate is unchanged', () => {
    expect(detectShift(base, { ...base })).toBeNull();
  });
});
