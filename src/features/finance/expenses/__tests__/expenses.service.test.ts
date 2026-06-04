import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

// Route the database helpers the service imports to a per-test in-memory
// better-sqlite3 instance. The SQL engine is real (no SQLite mocking) — only
// the connection is swapped, so the real migrations and queries run.
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
  createCategory,
  createExpense,
  deleteCategory,
  getAllCategories,
  getAllExpenses,
  getCategories,
  getExpensesByCategory,
  getExpensesByDateRange,
  getSubcategories,
  renameCategory,
  reorderCategories,
  setCategoryHidden,
} from '@/features/finance/expenses/expenses.service';
import type { NewExpense } from '@/features/finance/expenses/expenses.types';

let sqlite: Database.Database;

function newExpense(overrides: Partial<NewExpense> = {}): NewExpense {
  return {
    amount: 1500,
    categoryId: 1,
    subcategoryId: null,
    note: null,
    date: '2026-06-12',
    isRecurring: false,
    ...overrides,
  };
}

beforeEach(async () => {
  sqlite = new Database(':memory:');
  // better-sqlite3's bind-param types are stricter than the driver's structural
  // shape (null vs {}); the cast bridges that gap without loosening to `any`.
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

describe('createExpense / getAllExpenses', () => {
  it('creates an expense and includes it in getAllExpenses', async () => {
    const id = await createExpense(newExpense({ amount: 1500, date: '2026-06-12' }));
    expect(id).toBeGreaterThan(0);

    const all = await getAllExpenses();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id, amount: 1500, date: '2026-06-12' });
  });

  it('persists amounts as integers (no decimal coercion)', async () => {
    const id = await createExpense(newExpense({ amount: 150000 }));
    const stored = sqlite.prepare('SELECT amount FROM expenses WHERE id = ?').get(id) as {
      amount: number;
    };
    expect(stored.amount).toBe(150000);
    expect(Number.isInteger(stored.amount)).toBe(true);
  });

  it('orders results newest-first by date then created_at', async () => {
    await createExpense(newExpense({ date: '2026-06-01' }));
    await createExpense(newExpense({ date: '2026-06-20' }));
    await createExpense(newExpense({ date: '2026-06-10' }));

    const all = await getAllExpenses();
    expect(all.map((e) => e.date)).toEqual(['2026-06-20', '2026-06-10', '2026-06-01']);
  });

  it('rejects a zero or negative amount without inserting a row', async () => {
    await expect(createExpense(newExpense({ amount: 0 }))).rejects.toThrow();
    await expect(createExpense(newExpense({ amount: -500 }))).rejects.toThrow();
    expect(await getAllExpenses()).toHaveLength(0);
  });

  it('rejects a missing category without inserting a row', async () => {
    await expect(
      createExpense(newExpense({ categoryId: null as unknown as number })),
    ).rejects.toThrow();
    expect(await getAllExpenses()).toHaveLength(0);
  });
});

describe('getExpensesByDateRange', () => {
  it('returns only expenses within the inclusive range', async () => {
    await createExpense(newExpense({ date: '2026-06-01' }));
    await createExpense(newExpense({ date: '2026-06-15' }));
    await createExpense(newExpense({ date: '2026-07-01' }));

    const inJune = await getExpensesByDateRange('2026-06-01', '2026-06-30');
    expect(inJune.map((e) => e.date)).toEqual(['2026-06-15', '2026-06-01']);
  });

  it('returns empty when nothing matches', async () => {
    await createExpense(newExpense({ date: '2026-06-15' }));
    expect(await getExpensesByDateRange('2026-01-01', '2026-01-31')).toEqual([]);
  });
});

describe('getExpensesByCategory', () => {
  it('returns only expenses for the given category', async () => {
    await createExpense(newExpense({ categoryId: 1 }));
    await createExpense(newExpense({ categoryId: 1 }));
    await createExpense(newExpense({ categoryId: 9 }));

    const cat1 = await getExpensesByCategory(1);
    expect(cat1).toHaveLength(2);
    expect(cat1.every((e) => e.categoryId === 1)).toBe(true);
  });

  it('returns empty for an unknown category', async () => {
    await createExpense(newExpense({ categoryId: 1 }));
    expect(await getExpensesByCategory(999)).toEqual([]);
  });
});

describe('seeded categories', () => {
  it('getCategories returns the eight default parents in seed order', async () => {
    const parents = await getCategories();
    expect(parents.map((c) => c.name)).toEqual([
      'Food',
      'Transport',
      'Bills',
      'Health',
      'Entertainment',
      'Education',
      'Shopping',
      'Other',
    ]);
    expect(parents.every((c) => c.parentId === null && c.isDefault)).toBe(true);
  });

  it('getSubcategories returns a parent’s children in seed order', async () => {
    const [food] = await getCategories();
    const subs = await getSubcategories(food.id);
    expect(subs.map((s) => s.name)).toEqual(['Groceries', 'Restaurant', 'Snacks']);
    expect(subs.every((s) => s.parentId === food.id)).toBe(true);
  });

  it('getAllCategories returns both parents and subcategories', async () => {
    const all = await getAllCategories();
    const parents = all.filter((c) => c.parentId === null);
    const children = all.filter((c) => c.parentId !== null);
    expect(parents).toHaveLength(8);
    expect(children.length).toBeGreaterThan(8);
  });
});

async function parentIdByName(name: string): Promise<number> {
  const parents = await getCategories();
  const match = parents.find((c) => c.name === name);
  if (!match) throw new Error(`No parent category named ${name}`);
  return match.id;
}

describe('createCategory', () => {
  it('adds a custom parent category', async () => {
    const id = await createCategory({ name: 'Freelance Tools', parentId: null });
    const parents = await getCategories();
    expect(parents.find((c) => c.id === id)?.name).toBe('Freelance Tools');
  });

  it('adds a subcategory under a parent', async () => {
    const parentId = await createCategory({ name: 'Freelance Tools', parentId: null });
    const subId = await createCategory({ name: 'Software Subscriptions', parentId });
    const subs = await getSubcategories(parentId);
    expect(subs.map((s) => s.id)).toContain(subId);
    expect(subs.find((s) => s.id === subId)?.parentId).toBe(parentId);
  });

  it('rejects a blank name', async () => {
    await expect(createCategory({ name: '   ', parentId: null })).rejects.toThrow();
  });
});

describe('renameCategory', () => {
  it('changes the name', async () => {
    const id = await createCategory({ name: 'Freelnce', parentId: null });
    await renameCategory(id, 'Freelance');
    const parents = await getCategories();
    expect(parents.find((c) => c.id === id)?.name).toBe('Freelance');
  });

  it('rejects a blank name', async () => {
    const id = await createCategory({ name: 'Freelance', parentId: null });
    await expect(renameCategory(id, '  ')).rejects.toThrow();
  });
});

describe('setCategoryHidden', () => {
  it('removes a category from the picker query but keeps the row', async () => {
    const foodId = await parentIdByName('Food');
    await setCategoryHidden(foodId, true);

    const visible = await getCategories();
    expect(visible.find((c) => c.id === foodId)).toBeUndefined();

    const all = await getAllCategories();
    expect(all.find((c) => c.id === foodId)?.isHidden).toBe(true);
  });
});

describe('deleteCategory', () => {
  it('reassigns the category and its subcategory expenses to the target, then removes it', async () => {
    const parentId = await createCategory({ name: 'Freelance', parentId: null });
    const subId = await createCategory({ name: 'Tools', parentId });
    const otherId = await parentIdByName('Other');

    const expenseId = await createExpense({
      amount: 1500,
      categoryId: parentId,
      subcategoryId: subId,
      note: null,
      date: '2026-06-12',
      isRecurring: false,
    });

    await deleteCategory(parentId, otherId);

    const [moved] = await getExpensesByCategory(otherId);
    expect(moved.id).toBe(expenseId);
    expect(moved.subcategoryId).toBeNull();

    const all = await getAllCategories();
    expect(all.find((c) => c.id === parentId)).toBeUndefined();
    expect(all.find((c) => c.id === subId)).toBeUndefined();
  });

  it('refuses to delete a default category', async () => {
    const foodId = await parentIdByName('Food');
    const otherId = await parentIdByName('Other');
    await expect(deleteCategory(foodId, otherId)).rejects.toThrow();
  });

  it('refuses an unknown reassignment target', async () => {
    const id = await createCategory({ name: 'Freelance', parentId: null });
    await expect(deleteCategory(id, 99999)).rejects.toThrow();
  });

  it('refuses to reassign a category to itself', async () => {
    const id = await createCategory({ name: 'Freelance', parentId: null });
    await expect(deleteCategory(id, id)).rejects.toThrow();
  });

  it('refuses to reassign expenses into one of the deleted subcategories', async () => {
    const parentId = await createCategory({ name: 'Freelance', parentId: null });
    const subId = await createCategory({ name: 'Tools', parentId });
    await expect(deleteCategory(parentId, subId)).rejects.toThrow();
  });
});

describe('reorderCategories', () => {
  it('persists a new sort order for the given ids', async () => {
    const before = (await getCategories()).map((c) => c.id);
    const reversed = [...before].reverse();
    await reorderCategories(reversed);
    const after = (await getCategories()).map((c) => c.id);
    expect(after).toEqual(reversed);
  });
});
