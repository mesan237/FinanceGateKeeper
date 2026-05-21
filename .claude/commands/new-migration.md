---
description: Create the next numbered SQLite migration file in src/services/migrations/ with up/down stubs.
argument-hint: <short_description>
---

Create the next numbered migration in `src/services/migrations/` for: `$ARGUMENTS`.

Steps:

1. List existing files in `src/services/migrations/` to find the highest number used (e.g., `001_*.ts`, `002_*.ts`).
2. The new file is `src/services/migrations/NNN_<short_description_snake_case>.ts` where `NNN` is the next number, zero-padded to 3 digits.
3. Write the file with this exact structure:

```ts
import type { SQLiteDatabase } from "expo-sqlite";

export const id = "NNN_<short_description_snake_case>";

export async function up(db: SQLiteDatabase): Promise<void> {
  // TODO: implement
  throw new Error("not implemented");
}

export async function down(db: SQLiteDatabase): Promise<void> {
  // TODO: implement
  throw new Error("not implemented");
}
```

4. Open `src/services/database.ts` and add the new migration to the registry array in the correct numeric position. If the migrations registry pattern differs (e.g., directory auto-discovery), skip step 4 and tell the user.

5. Print the created path and remind the user:
   - Write a test that runs `up` then `down` and verifies schema state.
   - Migrations are immutable once committed — fix mistakes by adding another migration.

Do not run the migration. Do not edit any feature service files.
