import type { Migration } from '@/services/database';

import { migration001 } from '@/services/migrations/001_create_migrations_table';

export const migrations: ReadonlyArray<Migration> = [migration001];
