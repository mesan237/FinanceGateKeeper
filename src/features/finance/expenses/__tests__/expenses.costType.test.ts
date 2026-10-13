import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

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
  costTypeResolver,
  setCategoryCostType,
} from '@/features/finance/expenses/expenses.costType';
import { getAllCategories } from '@/features/finance/expenses/expenses.service';
import type { Category } from '@/features/finance/expenses/expenses.types';

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

async function categoryNamed(name: string, parent: boolean): Promise<Category> {
  const all = await getAllCategories();
  return all.find((c) => c.name === name && (c.parentId === null) === parent)!;
}

describe('category cost type (VS-41)', () => {
  it('reads each category with its stored cost type', async () => {
    expect((await categoryNamed('Bills', true)).costType).toBe('fixed');
    expect((await categoryNamed('Food', true)).costType).toBeNull();
  });

  it('sets, changes and clears a category cost type', async () => {
    const food = await categoryNamed('Food', true);

    await setCategoryCostType(food.id, 'fixed');
    expect((await categoryNamed('Food', true)).costType).toBe('fixed');

    await setCategoryCostType(food.id, null);
    expect((await categoryNamed('Food', true)).costType).toBeNull();
  });
});

describe('costTypeResolver', () => {
  const CATEGORIES: Category[] = [
    { id: 1, name: 'Bills', parentId: null, isDefault: true, isHidden: false, costType: 'fixed' },
    { id: 2, name: 'Rent', parentId: 1, isDefault: true, isHidden: false, costType: null },
    { id: 3, name: 'Internet', parentId: 1, isDefault: true, isHidden: false, costType: 'variable' },
    { id: 4, name: 'Food', parentId: null, isDefault: true, isHidden: false, costType: null },
    { id: 5, name: 'Market', parentId: 4, isDefault: true, isHidden: false, costType: 'fixed' },
  ];
  const resolve = costTypeResolver(CATEGORIES);

  it('uses the parent tag when the expense has no subcategory', () => {
    expect(resolve(1, null)).toBe('fixed');
  });

  it('lets an untagged subcategory inherit its parent', () => {
    expect(resolve(1, 2)).toBe('fixed');
  });

  it('lets a tagged subcategory override its parent either way', () => {
    expect(resolve(1, 3)).toBe('variable');
    expect(resolve(4, 5)).toBe('fixed');
  });

  it('reads an untagged parent, or an unknown category, as variable', () => {
    expect(resolve(4, null)).toBe('variable');
    expect(resolve(99, null)).toBe('variable');
  });
});
