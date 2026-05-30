import type { Migration } from '@/services/database';

import { migration as createUsersTable } from '@/services/migrations/002_create_users_table';

export const migrations: ReadonlyArray<Migration> = [createUsersTable];
