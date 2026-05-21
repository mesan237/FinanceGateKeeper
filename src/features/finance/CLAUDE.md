# Rules for `features/finance/*` (Feature Slices)

Each subfolder is one **vertical slice** of business domain. Slices are self-contained.

## Slice File Layout

Every slice contains, at minimum:

- `<Screen>.tsx` — top-level UI for the slice (PascalCase + `Screen` suffix).
- `<feature>.hooks.ts` — React hooks exposing slice state to UI.
- `<feature>.service.ts` — pure logic and DB calls. No JSX, no React imports.
- `<feature>.types.ts` — TypeScript types specific to this slice.

Additional components go in the same folder using PascalCase (e.g., `CategoryPicker.tsx`).

## Import Rules

- **Always allowed:** `components/`, `services/`, `hooks/`, `utils/`, `notifications/`, `constants/`, `types/` via `@/` paths.
- **Cross-feature imports:** restricted to the approved list in `docs/ARCHITECTURE.md` ("Cross-feature imports" table). Anything outside that list is a violation.
- **Forbidden:** importing from `app/` (routes never get imported).

## Service Layer

`*.service.ts` files call helpers from `services/database.ts` — they never open raw SQLite connections directly.

## Hooks Layer

`*.hooks.ts` wraps service calls in React state. UI components consume hooks, not services directly.

## Tests

Every new service function and hook ships with a Jest test. Screens get React Native Testing Library tests covering the TDD Anchor listed in the slice's `issues/ISSUE-00X/implementation-plan.md`.
