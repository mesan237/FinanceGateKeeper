# ISSUE-009 / VS-09 — Funds — Phase 2 Implementation Plan

Concrete, file-by-file, TDD-ordered. Derived from `implementation-plan.md` and grounded in the
existing VS-06 budget code (`AllocationScreen`, `budget.service`, `getOrCreateCurrentAllocation`),
the in-memory better-sqlite3 test harness, and the shared primitives (`Card`, `ProgressBar`,
`Modal`, `TextInput`, `Button`).

## Milestones (each: Red → Green → Refactor, run suite after)

### M1 — Database layer
- **Create** `src/services/migrations/010_create_funds_table.ts`
  `funds(id PK AUTOINC, type TEXT NOT NULL UNIQUE CHECK(type IN ('emergency','savings')),
  target_amount INTEGER, current_amount INTEGER NOT NULL DEFAULT 0,
  is_target_met INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`.
- **Create** `src/services/migrations/011_create_fund_transactions_table.ts`
  `fund_transactions(id PK AUTOINC, fund_id INTEGER NOT NULL, amount INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('deposit','withdrawal')), reason TEXT,
  date TEXT NOT NULL, created_at TEXT NOT NULL)` + `idx_fund_transactions_fund_id`.
- **Modify** `src/services/migrations/index.ts` — import + register both (ids 10, 11).
- No standalone test; exercised by M2's in-memory migrations run.

### M2 — Constants, types, funds.service (the core)
1. **Red** — `src/features/finance/funds/__tests__/funds.service.test.ts` (mirrors
   `budget.service.test.ts`: per-test `:memory:` better-sqlite3 + `runMigrations`). Covers
   TDD anchors #1: `getOrCreateFunds` (seeds emergency target 500000 / savings null, idempotent),
   `depositToFund` (increments + writes transaction, rejects ≤0, `targetNewlyMet` only on the
   crossing deposit), `withdrawFromFund` (decrements, rejects over-withdraw, resets `is_target_met`
   below target), `getFundProgress` (pct with/without target), `updateFundTarget` (emergency
   mandatory-positive, savings nullable).
2. **Green** —
   - **Create** `src/constants/funds.ts` — `FUND_TYPE_VALUES`/`FundType`/`FUND_TYPE_SET`/
     `FUND_TYPE_LABELS`, `TRANSACTION_DIRECTION_VALUES`/`TransactionDirection`,
     `DEFAULT_EMERGENCY_TARGET = 500000`.
   - **Create** `src/features/finance/funds/funds.types.ts` — `Fund`, `FundTransaction`,
     `FundProgress`, `DepositResult` (re-export `FundType`/`TransactionDirection` from constants).
   - **Create** `src/features/finance/funds/funds.service.ts` — functions per the issue
     (`getOrCreateFunds`, `getFundByType`, `getFundById`, `depositToFund`, `withdrawFromFund`,
     `updateFundTarget`, `getFundProgress`, `getFundTransactions`). Balance mutations use the
     `BEGIN TRANSACTION`/`COMMIT`/`ROLLBACK` pattern already used in `runRecurringAutoLog`.

### M3 — budget.service redistribution
1. **Red** — extend `src/features/finance/budget/__tests__/budget.service.test.ts` (TDD anchor #2):
   `redistributeEmergencyPct` zeroes emergency and proportionally splits across savings/projects/
   expenses (all ints, sum 100); no-op when already 0; writes through a **locked** row.
2. **Green** — **Modify** `src/features/finance/budget/budget.service.ts`: add
   `redistributeEmergencyPct(monthISO)`. Math: `T = s+p+x`; `addS=floor(e*s/T)`,
   `addP=floor(e*p/T)`, expenses takes the remainder (`x + e - addS - addP`); `e→0`. Guard `T===0`
   (push all of `e` to expenses). Direct `UPDATE` of the four pct columns (bypasses the lock guard).

### M4 — funds.hooks
1. **Red** — `src/features/finance/funds/__tests__/funds.hooks.test.ts` (TDD anchor #3):
   `useFunds` loads funds+progress and re-fetches on `refresh`; `useFundDetail` exposes
   `transactions`, `withdraw`, `setTarget` (each re-fetches). Service mocked.
2. **Green** — **Create** `src/features/finance/funds/funds.hooks.ts` (`useFunds`, `useFundDetail`),
   mirroring `budget.hooks.ts` state/`useCallback`/error-swallowing shape.

### M5 — FundProgressBar + FundsOverview
1. **Red** — `src/features/finance/funds/__tests__/FundsOverview.test.tsx` (TDD anchor #4):
   renders both fund cards with balances + progress bars at correct %, card tap → `/funds/[id]`,
   loading/empty state. (`expo-router` + `funds.hooks` mocked, like `AllocationScreen.test.tsx`.)
2. **Green** —
   - **Create** `src/features/finance/funds/FundProgressBar.tsx` — wraps shared `ProgressBar`;
     null-target → balance-only label.
   - **Create** `src/features/finance/funds/FundsOverview.tsx` — `Card` per fund + `FundProgressBar`,
     `router.push('/funds/' + id)` on press.

### M6 — FundDetail + route wrapper
1. **Red** — `src/features/finance/funds/__tests__/FundDetail.test.tsx` (TDD anchor #5):
   renders progress + transaction history; "Log withdrawal" → `withdrawFromFund(amount, reason)`;
   "Edit target" → `updateFundTarget`.
2. **Green** —
   - **Create** `src/features/finance/funds/FundDetail.tsx` — progress, history list, withdrawal
     `Modal` (amount+reason via `TextInput`), edit-target control. Consumes `useFundDetail`.
   - **Create** `src/features/finance/funds/FundDetailRoute.tsx` — reads/validates
     `useLocalSearchParams<{ id }>()`, renders `<FundDetail fundId={…} />` (mirrors
     `AllocationFromIncomeRoute`).

### M7 — Allocation confirm wiring (deposits + redistribution trigger)
1. **Red** — extend `src/features/finance/budget/__tests__/AllocationScreen.test.tsx` (TDD anchor #6):
   confirm deposits `breakdown.emergencyFund`/`breakdown.savings` to funds; `targetNewlyMet` ⇒
   `redistributeEmergencyPct` called once; lock + replace still happen. (`funds.service` mocked.)
2. **Green** — **Modify** `src/features/finance/budget/AllocationScreen.tsx` `handleConfirm`:
   before locking, `depositToFund('emergency', breakdown.emergencyFund, 'Allocation '+month)` and
   `('savings', breakdown.savings, …)`, **skipping any zero amount** (service rejects ≤0); if the
   emergency deposit returns `targetNewlyMet`, call `redistributeEmergencyPct(month)`; then lock +
   `router.replace` as today.

### M8 — Routes + navigation entry
- **Create** `src/app/funds/index.tsx` — thin: renders `<FundsOverview />`.
- **Create** `src/app/funds/[id].tsx` — thin: renders `<FundDetailRoute />`.
- **Modify** `src/features/finance/budget/BudgetOverview.tsx` — add a "Funds" `Button` →
  `router.push('/funds')`. (Routes are thin → no dedicated tests; nav covered by existing
  BudgetOverview render path.)

### M9 — Gates
- Run `/check-arch` logic inline over the diff (assert: **no `funds → budget` import**; only new
  cross-feature edge is `budget → funds`; routes stay thin; `@/` paths; FCFA via `formatCurrency`).
- Invoke `code-reviewer` subagent on the branch diff; address any `BLOCK`.
- Mark VS-09 `✅ Done` in `docs/KANBAN.md` (test count + migrations 010, 011).

## Design decisions (rejected alternatives)

1. **Redistribution triggered from the budget confirm flow; `funds` never imports `budget`** —
   keeps the mutual dependency acyclic. `depositToFund` returns `targetNewlyMet`; `AllocationScreen`
   calls its own `redistributeEmergencyPct`. *Rejected:* `funds.service` calling `budget.service`
   (matches funds CLAUDE.md wording but creates a circular import). **Needs sign-off.**
2. **Default emergency target `500000`, seeded by `getOrCreateFunds` (service), savings target
   `null`** — mirrors `getOrCreateCurrentAllocation`; keeps an FCFA value out of the schema.
   *Rejected:* seeding in the migration. **Needs sign-off.**
3. **Redistribution writes the locked row directly, remainder-to-expenses rounding** — matches
   `calculateBreakdown`'s residual convention and the documented lock exception. *Rejected:* routing
   through `updateAllocation` (its lock guard would reject the write).
4. **Balance changes are single SQLite transactions** (transaction row + balance + flag together) —
   mirrors `runRecurringAutoLog`. *Rejected:* separate writes (crash leaves trail ≠ balance).
5. **Zero-amount buckets are skipped on confirm** — `depositToFund` rejects ≤0, so a redistributed
   (0%) emergency bucket isn't deposited. *Rejected:* allowing 0 deposits (noise rows).

## Deferred (out of scope this slice)
Reverse redistribution (restoring emergency % after a below-target withdrawal); `category_budgets`;
dashboard `FundStatusCard` (VS-13); double-confirm de-dup; Supabase mirroring (VS-15).
