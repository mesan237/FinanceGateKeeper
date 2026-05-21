# Project-Wide Rules — Finance Gatekeeper

## Expo Has Changed

Always read the versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing any Expo code. Do not assume APIs from memory — they may have moved or been renamed.

## Currency: FCFA Only

Every monetary value in this app is in FCFA. No multi-currency support, no symbol switching, no implicit conversions. Display formatting goes through `utils/formatCurrency.ts` exclusively. Multi-currency is out of scope (see PRD §12).

## TDD Discipline

Every vertical slice follows Red → Green → Refactor:

1. **Red:** failing test first (Jest for logic, RNTL for screens).
2. **Green:** minimum implementation to pass.
3. **Refactor:** clean up without breaking tests.

A slice is not Done until the tests in its KANBAN "TDD Anchor" pass.

## Dependency Rules (Summary)

Full table lives in `docs/ARCHITECTURE.md`. The short version:

- `app/` routes import only feature screens. No logic in routes.
- `features/finance/*` import shared infra freely; cross-feature imports are restricted to the approved list in ARCHITECTURE.md.
- `components/`, `services/`, `hooks/`, `utils/`, `notifications/` never import from features or routes.
- All imports use `@/` absolute paths.

## Reference Docs

- `docs/PRODUCT DOCUMENT.md` — what we're building and why.
- `docs/ARCHITECTURE.md` — how the code is organized and what rules govern it.
- `docs/KANBAN.md` — the vertical-slice backlog. ISSUE-00X maps 1:1 to VS-XX.
- `issues/ISSUE-00X/implementation-plan.md` — working spec for the current slice. Read this before writing code.
