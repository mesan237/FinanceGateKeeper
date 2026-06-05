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
  advanceDueDate,
  confirmZeroDay,
  createCategory,
  createExpense,
  createQuickAddTemplate,
  createRecurringExpense,
  deleteCategory,
  deleteQuickAddTemplate,
  deleteRecurringExpense,
  getAllCategories,
  getDayActivityStatus,
  hasExpensesOn,
  isZeroDayConfirmed,
  getAllExpenses,
  getCategories,
  getExpensesByCategory,
  getExpensesByDateRange,
  getQuickAddTemplates,
  getRecurringExpenses,
  getSubcategories,
  logFromQuickAddTemplate,
  renameCategory,
  reorderCategories,
  runRecurringAutoLog,
  setCategoryHidden,
  setRecurringActive,
  skipRecurringOccurrence,
  updateQuickAddTemplate,
  updateRecurringExpense,
} from '@/features/finance/expenses/expenses.service';
import type {
  NewExpense,
  NewQuickAddTemplate,
  NewRecurringExpense,
} from '@/features/finance/expenses/expenses.types';

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

// ---- VS-07: quick-add templates --------------------------------------------

function newTemplate(overrides: Partial<NewQuickAddTemplate> = {}): NewQuickAddTemplate {
  return {
    label: 'Taxi 500',
    amount: 500,
    categoryId: 2, // Transport
    subcategoryId: null,
    ...overrides,
  };
}

describe('createQuickAddTemplate / getQuickAddTemplates', () => {
  it('creates a template and includes it in the listing', async () => {
    const id = await createQuickAddTemplate(newTemplate());
    expect(id).toBeGreaterThan(0);

    const templates = await getQuickAddTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0]).toMatchObject({ id, label: 'Taxi 500', amount: 500, categoryId: 2 });
  });

  it('appends new templates after existing siblings via sort_order', async () => {
    const first = await createQuickAddTemplate(newTemplate({ label: 'Taxi 500' }));
    const second = await createQuickAddTemplate(newTemplate({ label: 'Lunch 1500', amount: 1500 }));
    const templates = await getQuickAddTemplates();
    expect(templates.map((t) => t.id)).toEqual([first, second]);
    expect(templates[0].sortOrder).toBeLessThan(templates[1].sortOrder);
  });

  it('rejects an empty label', async () => {
    await expect(createQuickAddTemplate(newTemplate({ label: '   ' }))).rejects.toThrow();
    expect(await getQuickAddTemplates()).toHaveLength(0);
  });

  it('rejects a zero or negative amount', async () => {
    await expect(createQuickAddTemplate(newTemplate({ amount: 0 }))).rejects.toThrow();
    await expect(createQuickAddTemplate(newTemplate({ amount: -500 }))).rejects.toThrow();
    expect(await getQuickAddTemplates()).toHaveLength(0);
  });

  it('rejects an unknown category id', async () => {
    await expect(createQuickAddTemplate(newTemplate({ categoryId: 99999 }))).rejects.toThrow();
    expect(await getQuickAddTemplates()).toHaveLength(0);
  });
});

describe('updateQuickAddTemplate', () => {
  it('mutates only the touched field', async () => {
    const id = await createQuickAddTemplate(newTemplate({ amount: 500 }));
    await updateQuickAddTemplate(id, { amount: 700 });
    const [template] = await getQuickAddTemplates();
    expect(template).toMatchObject({ id, amount: 700, label: 'Taxi 500' });
  });

  it('no-ops on an empty patch', async () => {
    const id = await createQuickAddTemplate(newTemplate());
    await expect(updateQuickAddTemplate(id, {})).resolves.toBeUndefined();
    const [template] = await getQuickAddTemplates();
    expect(template).toMatchObject({ amount: 500, label: 'Taxi 500' });
  });

  it('rejects an invalid amount', async () => {
    const id = await createQuickAddTemplate(newTemplate());
    await expect(updateQuickAddTemplate(id, { amount: 0 })).rejects.toThrow();
  });
});

describe('deleteQuickAddTemplate', () => {
  it('removes the row', async () => {
    const id = await createQuickAddTemplate(newTemplate());
    await deleteQuickAddTemplate(id);
    expect(await getQuickAddTemplates()).toHaveLength(0);
  });
});

describe('logFromQuickAddTemplate', () => {
  it('creates an expense matching the template, dated today by default', async () => {
    const id = await createQuickAddTemplate(
      newTemplate({ amount: 500, categoryId: 2, subcategoryId: null }),
    );
    const today = new Date().toISOString().slice(0, 10);
    const expenseId = await logFromQuickAddTemplate(id);

    const [expense] = await getAllExpenses();
    expect(expense.id).toBe(expenseId);
    expect(expense).toMatchObject({ amount: 500, categoryId: 2, date: today, isRecurring: false });
  });

  it('honors an explicit date', async () => {
    const id = await createQuickAddTemplate(newTemplate());
    await logFromQuickAddTemplate(id, '2026-05-01');
    const [expense] = await getAllExpenses();
    expect(expense.date).toBe('2026-05-01');
  });

  it('throws when the template is missing', async () => {
    await expect(logFromQuickAddTemplate(99999)).rejects.toThrow();
  });
});

// ---- VS-07: recurring expenses ---------------------------------------------

function newRecurring(overrides: Partial<NewRecurringExpense> = {}): NewRecurringExpense {
  return {
    label: 'Rent',
    amount: 150000,
    categoryId: 3, // Bills
    subcategoryId: null,
    frequency: 'monthly',
    nextDueDate: '2026-07-01',
    isActive: true,
    ...overrides,
  };
}

describe('createRecurringExpense / getRecurringExpenses', () => {
  it('creates a recurring expense and lists it', async () => {
    const id = await createRecurringExpense(newRecurring());
    expect(id).toBeGreaterThan(0);
    const [row] = await getRecurringExpenses();
    expect(row).toMatchObject({
      id,
      label: 'Rent',
      amount: 150000,
      frequency: 'monthly',
      nextDueDate: '2026-07-01',
      isActive: true,
    });
  });

  it('orders by next_due_date ascending then id', async () => {
    const later = await createRecurringExpense(newRecurring({ nextDueDate: '2026-08-01' }));
    const earlier = await createRecurringExpense(newRecurring({ nextDueDate: '2026-07-01' }));
    const rows = await getRecurringExpenses();
    expect(rows.map((r) => r.id)).toEqual([earlier, later]);
  });

  it('rejects a malformed next due date', async () => {
    await expect(createRecurringExpense(newRecurring({ nextDueDate: '07/01/2026' }))).rejects.toThrow();
  });

  it('rejects a zero amount, empty label, unknown category, invalid frequency', async () => {
    await expect(createRecurringExpense(newRecurring({ amount: 0 }))).rejects.toThrow();
    await expect(createRecurringExpense(newRecurring({ label: '  ' }))).rejects.toThrow();
    await expect(createRecurringExpense(newRecurring({ categoryId: 99999 }))).rejects.toThrow();
    await expect(
      createRecurringExpense(newRecurring({ frequency: 'yearly' as never })),
    ).rejects.toThrow();
    expect(await getRecurringExpenses()).toHaveLength(0);
  });
});

describe('updateRecurringExpense', () => {
  it('mutates only the touched field', async () => {
    const id = await createRecurringExpense(newRecurring({ amount: 150000 }));
    await updateRecurringExpense(id, { amount: 160000 });
    const [row] = await getRecurringExpenses();
    expect(row).toMatchObject({ id, amount: 160000, label: 'Rent' });
  });

  it('rejects an invalid touched field', async () => {
    const id = await createRecurringExpense(newRecurring());
    await expect(updateRecurringExpense(id, { nextDueDate: 'nope' })).rejects.toThrow();
  });
});

describe('setRecurringActive', () => {
  it('toggles the flag and survives a re-read', async () => {
    const id = await createRecurringExpense(newRecurring());
    await setRecurringActive(id, false);
    expect((await getRecurringExpenses())[0].isActive).toBe(false);
    await setRecurringActive(id, true);
    expect((await getRecurringExpenses())[0].isActive).toBe(true);
  });
});

describe('deleteRecurringExpense', () => {
  it('removes the row but keeps already-logged expenses', async () => {
    const id = await createRecurringExpense(newRecurring({ nextDueDate: '2026-07-01' }));
    await runRecurringAutoLog('2026-07-01');
    await deleteRecurringExpense(id);
    expect(await getRecurringExpenses()).toHaveLength(0);
    expect(await getAllExpenses()).toHaveLength(1);
  });
});

describe('skipRecurringOccurrence', () => {
  it('advances by one period and logs nothing', async () => {
    const id = await createRecurringExpense(newRecurring({ nextDueDate: '2026-07-01' }));
    await skipRecurringOccurrence(id);
    const [row] = await getRecurringExpenses();
    expect(row.nextDueDate).toBe('2026-08-01');
    expect(await getAllExpenses()).toHaveLength(0);
  });

  it('throws when the row is inactive', async () => {
    const id = await createRecurringExpense(newRecurring({ isActive: true }));
    await setRecurringActive(id, false);
    await expect(skipRecurringOccurrence(id)).rejects.toThrow();
  });
});

describe('runRecurringAutoLog', () => {
  it('logs one occurrence and advances, idempotent on a same-day re-run', async () => {
    await createRecurringExpense(newRecurring({ nextDueDate: '2026-07-01' }));

    const first = await runRecurringAutoLog('2026-07-01');
    expect(first.loggedCount).toBe(1);
    expect((await getRecurringExpenses())[0].nextDueDate).toBe('2026-08-01');

    const second = await runRecurringAutoLog('2026-07-01');
    expect(second.loggedCount).toBe(0);
    expect(await getAllExpenses()).toHaveLength(1);
  });

  it('replays every missed occurrence inside the window', async () => {
    await createRecurringExpense(newRecurring({ nextDueDate: '2026-07-01' }));

    const result = await runRecurringAutoLog('2026-09-15');
    expect(result.loggedCount).toBe(3);

    const dates = (await getAllExpenses()).map((e) => e.date).sort();
    expect(dates).toEqual(['2026-07-01', '2026-08-01', '2026-09-01']);
    expect((await getAllExpenses()).every((e) => e.isRecurring)).toBe(true);
    expect((await getRecurringExpenses())[0].nextDueDate).toBe('2026-10-01');
  });

  it('ignores inactive rows even when due', async () => {
    const id = await createRecurringExpense(newRecurring({ nextDueDate: '2026-07-01' }));
    await setRecurringActive(id, false);
    const result = await runRecurringAutoLog('2026-09-15');
    expect(result.loggedCount).toBe(0);
    expect(await getAllExpenses()).toHaveLength(0);
  });
});

describe('advanceDueDate', () => {
  it('clamps the day to the target month last day', () => {
    expect(advanceDueDate('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(advanceDueDate('2024-02-29', 'monthly')).toBe('2024-03-29');
  });

  it('rolls over the year boundary', () => {
    expect(advanceDueDate('2026-12-31', 'monthly')).toBe('2027-01-31');
  });

  it('adds seven days for weekly', () => {
    expect(advanceDueDate('2026-06-12', 'weekly')).toBe('2026-06-19');
    expect(advanceDueDate('2026-06-28', 'weekly')).toBe('2026-07-05');
  });
});

describe('zero-day confirmation', () => {
  it('confirms a zero-day and reads it back', async () => {
    await confirmZeroDay('2026-06-05');
    expect(await isZeroDayConfirmed('2026-06-05')).toBe(true);
    expect(await isZeroDayConfirmed('2026-06-06')).toBe(false);
  });

  it('is idempotent for the same date', async () => {
    await confirmZeroDay('2026-06-05');
    await confirmZeroDay('2026-06-05');
    const [{ count }] = sqlite
      .prepare('SELECT COUNT(*) AS count FROM zero_days WHERE date = ?')
      .all('2026-06-05') as { count: number }[];
    expect(count).toBe(1);
  });

  it('rejects a malformed date', async () => {
    await expect(confirmZeroDay('05-06-2026')).rejects.toThrow();
  });

  it('detects whether a day has expenses', async () => {
    await createExpense(newExpense({ date: '2026-06-10' }));
    expect(await hasExpensesOn('2026-06-10')).toBe(true);
    expect(await hasExpensesOn('2026-06-11')).toBe(false);
  });

  it('reports combined day activity status', async () => {
    await createExpense(newExpense({ date: '2026-06-10' }));
    await confirmZeroDay('2026-06-11');

    expect(await getDayActivityStatus('2026-06-10')).toEqual({
      hasExpenses: true,
      zeroDayConfirmed: false,
    });
    expect(await getDayActivityStatus('2026-06-11')).toEqual({
      hasExpenses: false,
      zeroDayConfirmed: true,
    });
    expect(await getDayActivityStatus('2026-06-12')).toEqual({
      hasExpenses: false,
      zeroDayConfirmed: false,
    });
  });
});
