import type { ProjectStatus } from '@/constants/projects';
import { execute, query } from '@/services/database';
import { toISODate } from '@/utils/formatDate';

import type { NewProject, Project, ProjectPatch, ProjectTransaction } from './projects.types';

// Pure timeline math lives in its own module (decoupled, re-exported here) so
// this service stays focused on DB access and under the file-length cap.
export { detectShift, estimateTimeline } from './projects.timeline';

interface ProjectRow {
  id: number;
  name: string;
  target_amount: number;
  funded_amount: number;
  priority_rank: number;
  deadline: string | null;
  status: ProjectStatus;
  created_at: string;
}

interface ProjectTransactionRow {
  id: number;
  project_id: number;
  amount: number;
  date: string;
  source: 'allocation' | 'manual';
  created_at: string;
}

const PROJECT_COLUMNS =
  'id, name, target_amount, funded_amount, priority_rank, deadline, status, created_at';
const TXN_COLUMNS = 'id, project_id, amount, date, source, created_at';

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    fundedAmount: row.funded_amount,
    priorityRank: row.priority_rank,
    deadline: row.deadline,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapTransaction(row: ProjectTransactionRow): ProjectTransaction {
  return {
    id: row.id,
    projectId: row.project_id,
    amount: row.amount,
    date: row.date,
    source: row.source,
    createdAt: row.created_at,
  };
}

/** Reads all projects ordered by priority rank (1 = highest). */
export async function getProjects(): Promise<Project[]> {
  const rows = await query<ProjectRow>(
    `SELECT ${PROJECT_COLUMNS} FROM projects ORDER BY priority_rank`,
  );
  return rows.map(mapProject);
}

/** Reads a project by id, or `null` if no such row exists. */
export async function getProjectById(id: number): Promise<Project | null> {
  const rows = await query<ProjectRow>(`SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = ?`, [id]);
  return rows[0] ? mapProject(rows[0]) : null;
}

async function requireProject(id: number): Promise<Project> {
  const project = await getProjectById(id);
  if (!project) throw new Error(`Project ${id} does not exist.`);
  return project;
}

/**
 * Creates a project at the lowest priority (max existing rank + 1). The target
 * must be a positive integer; the name must be non-empty.
 *
 * @returns the new project's id.
 */
export async function createProject(input: NewProject): Promise<number> {
  const name = input.name.trim();
  if (!name) throw new Error('Project name is required.');
  if (!Number.isInteger(input.targetAmount) || input.targetAmount <= 0) {
    throw new Error('Project target must be a positive integer.');
  }
  const [{ maxRank }] = await query<{ maxRank: number | null }>(
    'SELECT MAX(priority_rank) AS maxRank FROM projects',
  );
  const rank = (maxRank ?? 0) + 1;
  await execute(
    `INSERT INTO projects (name, target_amount, funded_amount, priority_rank, deadline, status, created_at)
     VALUES (?, ?, 0, ?, ?, 'active', ?)`,
    [name, input.targetAmount, rank, input.deadline ?? null, new Date().toISOString()],
  );
  const [{ id }] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return id;
}

/** Whether a funded amount meets a target. */
function statusFor(fundedAmount: number, targetAmount: number, current: ProjectStatus): ProjectStatus {
  if (current === 'paused') return 'paused';
  return fundedAmount >= targetAmount ? 'completed' : 'active';
}

/**
 * Updates a project's name, target, and/or deadline, then re-derives its status
 * against the (possibly new) target — a raised target can re-open a completed
 * project; a lowered one can complete it. Does not touch priority or funding.
 */
export async function updateProject(id: number, patch: ProjectPatch): Promise<void> {
  const project = await requireProject(id);
  const name = patch.name === undefined ? project.name : patch.name.trim();
  if (!name) throw new Error('Project name is required.');
  const targetAmount = patch.targetAmount === undefined ? project.targetAmount : patch.targetAmount;
  if (!Number.isInteger(targetAmount) || targetAmount <= 0) {
    throw new Error('Project target must be a positive integer.');
  }
  const deadline = patch.deadline === undefined ? project.deadline : patch.deadline;
  const status = statusFor(project.fundedAmount, targetAmount, project.status);
  await execute(
    'UPDATE projects SET name = ?, target_amount = ?, deadline = ?, status = ? WHERE id = ?',
    [name, targetAmount, deadline, status, id],
  );
}

/** Sets a project's status directly (pause / resume / complete). */
export async function setStatus(id: number, status: ProjectStatus): Promise<void> {
  await requireProject(id);
  await execute('UPDATE projects SET status = ? WHERE id = ?', [status, id]);
}

/** Deletes a project and re-packs the remaining priority ranks to stay contiguous. */
export async function deleteProject(id: number): Promise<void> {
  await execute('DELETE FROM projects WHERE id = ?', [id]);
  const remaining = await getProjects();
  await reorderPriority(remaining.map((p) => p.id));
}

/**
 * Rewrites priority ranks from `orderedIds` (index 0 → rank 1). Runs in one
 * transaction so a crash can't leave ranks half-rewritten.
 */
export async function reorderPriority(orderedIds: ReadonlyArray<number>): Promise<void> {
  await execute('BEGIN TRANSACTION');
  try {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await execute('UPDATE projects SET priority_rank = ? WHERE id = ?', [i + 1, orderedIds[i]]);
    }
    await execute('COMMIT');
  } catch (error) {
    await execute('ROLLBACK');
    throw error;
  }
}

/** Applies one contribution to one project in a single transaction. */
async function applyContribution(
  project: Project,
  amount: number,
  source: 'allocation' | 'manual',
  dateISO: string,
  accountId: number | null = null,
): Promise<void> {
  const newFunded = project.fundedAmount + amount;
  const status = statusFor(newFunded, project.targetAmount, project.status);
  await execute('BEGIN TRANSACTION');
  try {
    await execute(
      `INSERT INTO project_transactions (project_id, amount, date, source, account_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [project.id, amount, dateISO, source, accountId, new Date().toISOString()],
    );
    await execute('UPDATE projects SET funded_amount = ?, status = ? WHERE id = ?', [
      newFunded,
      status,
      project.id,
    ]);
    await execute('COMMIT');
  } catch (error) {
    await execute('ROLLBACK');
    throw error;
  }
}

/**
 * Distributes `projectsAmount` (the allocation's projects bucket) across active
 * projects by ascending priority rank: each project is filled to its target
 * before the next receives anything; a project that reaches its target is
 * marked `completed`; paused and completed projects are skipped. Any remainder
 * after every active project is full stays unallocated. A no-op for a
 * non-positive amount or when no active project has room.
 */
export async function fundProjects(
  projectsAmount: number,
  dateISO: string = toISODate(new Date()),
): Promise<void> {
  if (projectsAmount <= 0) return;
  let remaining = projectsAmount;
  const active = await query<ProjectRow>(
    `SELECT ${PROJECT_COLUMNS} FROM projects WHERE status = 'active' ORDER BY priority_rank`,
  );
  for (const row of active) {
    if (remaining <= 0) break;
    const project = mapProject(row);
    const gap = project.targetAmount - project.fundedAmount;
    if (gap <= 0) continue;
    const contribution = Math.min(remaining, gap);
    await applyContribution(project, contribution, 'allocation', dateISO);
    remaining -= contribution;
  }
}

/** Adds a manual contribution to a single project (rejects a non-positive amount). */
export async function contributeManually(
  id: number,
  amount: number,
  dateISO: string = toISODate(new Date()),
  accountId: number | null = null,
): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Contribution amount must be a positive integer.');
  }
  const project = await requireProject(id);
  await applyContribution(project, amount, 'manual', dateISO, accountId);
}

/** Returns a project's contributions, newest first. */
export async function getProjectTransactions(projectId: number): Promise<ProjectTransaction[]> {
  const rows = await query<ProjectTransactionRow>(
    `SELECT ${TXN_COLUMNS} FROM project_transactions WHERE project_id = ? ORDER BY id DESC`,
    [projectId],
  );
  return rows.map(mapTransaction);
}
