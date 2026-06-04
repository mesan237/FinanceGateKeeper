# ISSUE-004 — Category & Subcategory Management

**Maps to:** KANBAN VS-04
**Priority:** High
**Blocked by:** VS-03 (✅ Done)

---

## Problem Statement

VS-03 seeds a fixed default category tree and lets the user pick from it, but
the tree is read-only — there's no way to add a "Freelance Tools" category,
rename a mislabeled one, hide one that doesn't fit, or remove a custom one.
VS-04 makes the category tree editable while protecting the seeded defaults and
the integrity of already-logged expenses.

## User Stories

- **As the builder,** I can add a new parent category ("Freelance Tools") and a
  subcategory under it ("Software Subscriptions"), then immediately pick them
  when logging an expense.
- **As the builder,** I can rename a category and reorder the list so my most-
  used categories sit at the top.
- **As the builder,** I can remove a custom category I no longer use — and the
  app makes me say where its existing expenses should go first, so nothing is
  orphaned.
- **As the builder,** I can hide a default category I never use without losing
  the historical expenses filed under it.

## Scope

Each bullet maps to a concrete file. Tests precede implementation per TDD.

### Database

- `src/services/migrations/003_add_category_is_hidden.ts` — `ALTER TABLE
  categories ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0`. Additive; existing
  rows default to visible. Needed so default categories can be **hidden** rather
  than deleted (per `expenses/CLAUDE.md`).
- `src/services/migrations/index.ts` — register `003`.

### Types — `expenses.types.ts`

- `Category` gains `isHidden: boolean`.
- `NewCategory { name: string; parentId: number | null }` — input for create.

### Service — `expenses.service.ts`

New functions (existing read functions get an `is_hidden` adjustment, see
Design Decisions):

- `createCategory(input: NewCategory): Promise<number>` — inserts a parent
  (`parentId: null`) or subcategory; `is_default = 0`, `is_hidden = 0`,
  `sort_order = (max sibling sort_order) + 1`. Rejects blank names. Returns id.
- `renameCategory(id: number, name: string): Promise<void>` — rejects blank names.
- `setCategoryHidden(id: number, hidden: boolean): Promise<void>` — toggles
  `is_hidden` (the only removal path allowed for default categories).
- `deleteCategory(id: number, reassignToId: number): Promise<void>` — **custom
  categories only.** Reassigns every expense referencing the category (or any of
  its subcategories) to `reassignToId`, deletes the subcategories, then deletes
  the category. Throws if the category `is_default`, if `reassignToId` is the
  same category, or if `reassignToId` doesn't exist.
- `reorderCategories(orderedIds: number[]): Promise<void>` — writes each id's new
  `sort_order` from its position in the array.

### Hooks — `expenses.hooks.ts`

Extend `useCategories` to own category CRUD and expose a `refresh`:

- Returns `{ categories, managedCategories, subcategoriesOf, labelFor, loading,
  refresh, addCategory, rename, remove, toggleHidden, reorder }`.
  - `categories` — visible parents (for the picker).
  - `managedCategories` — **all** parents incl. hidden (for the manager).
  - mutators call the service then `refresh()` (re-fetch; simple and correct for
    a single-user local DB — no optimistic cache to invalidate).

### Components

- `CategoryManager.tsx` — sectioned list of parents, each with its subcategories.
  Per row: rename (inline edit), hide/unhide toggle, delete (custom only, opens a
  reassignment chooser), and move up/down to reorder. "Add category" and
  "Add subcategory" actions. Hidden rows are visually dimmed with an Unhide action.
- `CategoryPicker.tsx` (modify) — re-fetch when it becomes visible so newly
  added/renamed/hidden categories appear without remounting the log screen.
  Also gains a **"Manage categories"** action that navigates to
  `/expenses/categories` (the chosen entry point into the manager).

### Route

- `src/app/expenses/categories.tsx` — thin route rendering `<CategoryManager />`.

## TDD Anchors

1. **expenses.service** — extend `__tests__/expenses.service.test.ts` (runs on
   the real in-memory DB through migrations 001–003):
   - `createCategory` adds a parent and returns it from `getManaged…`/parents
   - `createCategory` adds a subcategory under a parent, visible via `getSubcategories`
   - `renameCategory` changes the name; rejects an empty name
   - `setCategoryHidden(true)` removes it from `getCategories` (picker) but keeps
     the row and its label resolvable
   - `deleteCategory` reassigns the category's (and its subcategories') expenses
     to the target, then removes the rows
   - `deleteCategory` throws for a **default** category (hide-only)
   - `deleteCategory` throws when no/invalid reassignment target
   - `reorderCategories` persists the new `sort_order`
2. **CategoryManager** — `__tests__/CategoryManager.test.tsx`:
   - renders seeded parents with their subcategories
   - adding a category makes it appear in the list
   - rename flow updates the displayed name
   - deleting a custom category prompts for a reassignment target before removing
3. **useCategories** — extend `__tests__/expenses.hooks.test.ts`:
   - `addCategory` then `refresh` exposes the new category
   - `categories` excludes hidden; `managedCategories` includes them

## Acceptance Check (Done When)

- From the log screen's category picker (or a Manage entry point) I can open the
  manager, add "Freelance Tools", add "Software Subscriptions" under it, and both
  show up in the picker when I next log an expense.
- Renaming "Snacks" → "Street Food" updates it everywhere it's referenced.
- Hiding "Education" removes it from the picker; past Education expenses still
  show their label in the transaction list.
- Deleting a custom category asks where to move its expenses, moves them, then
  removes it. Trying to delete a default category offers Hide instead.
- `npm test` — service, manager, and hooks suites pass.

## Design Decisions (proposed — confirm at approval)

- **Add `is_hidden` via migration 003 (don't repurpose delete).** `expenses/
  CLAUDE.md` mandates "default categories cannot be deleted, only hidden." A
  boolean column is the minimal way to express that and also lets users hide
  custom categories. *Rejected:* a `status` enum — overkill for a binary.
- **Default categories are hide-only; custom categories are deletable.**
  `deleteCategory` throws on `is_default`. The manager surfaces Hide (not Delete)
  for defaults. *Rejected:* allow deleting defaults — would strand historical
  expenses and contradict the slice's CLAUDE.md.
- **Delete requires an explicit reassignment target; no orphans.** Matches the
  CLAUDE.md rule "deleting a category requires reassigning its expenses first."
  Both `category_id` and `subcategory_id` references are repointed to the target.
- **Deleting a parent cascades to its subcategories** (after their expenses are
  reassigned to the same target), so the manager never leaves dangling children.
  *Rejected:* block deletion of parents that have subcategories — more friction
  for the same end state.
- **Mutations re-fetch rather than optimistically patch a cache.** A single-user
  local SQLite DB makes re-query trivially cheap and avoids cache-coherence bugs.
  (Confirmed over KANBAN's "optimistic updates" wording.)
- **The manager is reached via a "Manage categories" link in the CategoryPicker
  modal** — category editing lives next to where categories are chosen.
- **Hidden categories are filtered in the UI from a single full fetch**, not by a
  separate SQL query, so an expense filed under a now-hidden category still
  resolves its label. `getCategories`/`getSubcategories` (the assignable-parents
  queries) exclude hidden; the manager reads the full set.
- **Reorder uses up/down move actions, not drag-and-drop.** Keeps the slice free
  of `react-native-gesture-handler` wiring and keeps `reorderCategories`
  unit-testable. Drag UX can come later if wanted.

## Out of Scope (Deferred)

- Drag-to-reorder gestures.
- Merging two categories into one.
- Per-category icons/colors.
- Bulk re-categorization of existing expenses beyond the delete-reassignment flow.

## After This Slice

Run `/check-arch` and the `code-reviewer` subagent. Mark VS-04 ✅ in
`docs/KANBAN.md` and delete this issue file after on-device verification.
