---
description: Scan the current branch diff for dependency-rule violations and forbidden cross-feature imports.
---

Audit the current branch against the dependency rules in `docs/ARCHITECTURE.md`. Read-only.

Steps:

1. Run `git diff --name-only main...HEAD` to list changed files.
2. For each changed `.ts` / `.tsx` file, read the import block at the top.
3. Apply the rules from ARCHITECTURE's "Rules enforced" table:
   - `app/**` may only import from `@/features/finance/**` (screens) or `@/components/**` (in `_layout.tsx`).
   - `features/finance/<X>/**` imports from another feature must appear in the "Cross-feature imports" table.
   - `components/**`, `services/**`, `hooks/**`, `utils/**`, `notifications/**` must NOT import from `@/features/` or `@/app/`.
   - `utils/**` may only import from `@/constants/**` or `@/types/**`.
4. Also check for relative imports (`../`) that should be `@/` absolute paths.
5. Also check for direct `expo-sqlite` imports outside `services/`.

Output format:

```
## Violations
- <file>:<line> — <imported module> — <which rule it breaks>

## Relative-path imports (should use @/)
- <file>:<line> — <import>

## Raw SQLite outside services/
- <file>:<line>

## Verdict
PASS / FAIL
```

If no changed files, print `No changes to check.` and exit.

Do not modify any files.
