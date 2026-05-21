---
description: Scaffold a new feature slice under src/features/finance/<name>/ with the four canonical files.
argument-hint: <slice-name>
---

Scaffold a new feature slice named `$1` under `src/features/finance/$1/`.

Before writing anything:
1. Read `docs/ARCHITECTURE.md` "Naming Conventions" and "Feature Slice Checklist".
2. Read `src/features/finance/CLAUDE.md`.
3. Confirm `$1` is a distinct business domain not already covered by an existing slice.

Then create exactly four files. Each is a minimal, type-correct skeleton — no business logic yet:

- `src/features/finance/$1/$1.types.ts` — empty `export {}` plus a placeholder `export interface ${PascalCase $1}State {}`.
- `src/features/finance/$1/$1.service.ts` — `import { db } from "@/services/database";` and an empty namespace export.
- `src/features/finance/$1/$1.hooks.ts` — `import { useState } from "react";` and an empty `export function use${PascalCase $1}() { return {}; }`.
- `src/features/finance/$1/${PascalCase $1}Screen.tsx` — minimal React Native component returning a `<View />` with a `Text` placeholder.

After writing, print the four created paths and remind the user to:
- Add a thin route under `app/` that imports the screen.
- Write the first failing test under `src/features/finance/$1/__tests__/`.

Do not create any other files. Do not modify existing files.
