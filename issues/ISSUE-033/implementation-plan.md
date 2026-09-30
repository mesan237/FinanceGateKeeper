# ISSUE-033 — VS-35: French Localization

## Problem Statement

The app is built for a user in Central/West Africa, where French is the working
language, yet every label, button, empty state, notification and date is
hard-coded in English across ~12k lines of screens. There is no i18n layer to
hang a translation on.

## Product Decisions (confirmed)

1. **Device language by default, with an override in Settings.** Settings gets a
   "Language" row with three choices: *System* (the default), *Français* and
   *English*. The override is saved on the device.
2. **i18next + react-i18next + expo-localization.** This is the standard stack.
   It handles plurals and interpolation, and TypeScript checks that keys exist.
3. **Default categories are translated when displayed, not in the database.** The
   names seeded by migration 001 ("Food", "Groceries"…) are matched to translation
   keys when rendered. Categories the user created or renamed display exactly as
   typed. No data migration, so sync and export files are unaffected.
4. **English stays the fallback and the test language.** Jest pins `lng: 'en'`, so
   the existing screen tests that check English text keep passing unmodified.

## Design

### `src/i18n/` — new shared-infrastructure root folder

```
src/i18n/
  index.ts              # i18next init (device language → 'fr' | 'en', fallback 'en')
  resolveLanguage.ts    # (override | null, deviceTag) → 'fr' | 'en'
  categoryNames.ts      # displayCategoryName(name): seeded default → t(key), else name
  i18next.d.ts          # CustomTypeOptions — typed keys from the English resources
  locales/
    en/<namespace>.ts   # common, auth, onboarding, expenses, income, accounts,
    fr/<namespace>.ts   # budget, dashboard, reports, debt, dataTransfer,
                        # notifications, categories, navigation
```

- Resources are **TypeScript**, not JSON. Every `fr/*.ts` is typed as
  `Translation<typeof en.*>`, so a missing or extra French key fails `tsc`. It can't
  slip through at runtime.
- Namespaces mirror the feature slices, but they live in shared infra. The init
  code has to load every namespace, and shared infra may not import features. The
  rule holds: features import `@/i18n`, never the reverse.
- Adding the `i18n/` root folder updates the shared-infra list in `CLAUDE.md` and
  `docs/ARCHITECTURE.md`.

### Language preference

- Migration **029** adds `users.language TEXT NULL` (NULL = follow the device).
  `users` is already outside the sync/export set, so the preference stays
  device-local.
- `auth.service` gets `setLanguage`, and `AppSettings.language` is added.
  `useAppSettings` exposes both.
- The root layout brokers the setting into i18n the same way it brokers onboarding
  and reminders: `i18n.changeLanguage(resolveLanguage(settings.language, deviceTag))`.
  No feature ever imports i18n state from `auth`.
- Changing language **reschedules the daily reminder**, so an already-scheduled
  notification doesn't stay in the old language.

### Formatting

- `formatDate.ts`: the English month and day arrays become per-locale tables
  (`janv.`, `févr.`… / `lun.`, `mar.`…). Each formatter takes an optional
  `locale`, defaulting to the active i18n language. The tables are hard-coded
  rather than taken from Intl, so output doesn't depend on which Hermes Intl build
  the device has.
- `formatCurrency` is unchanged. It already uses the FR convention (`1 500 FCFA`).
- Income-source labels in `constants/incomeSources.ts` become i18n keys.
  The `value` enum stays the same, and so does the DB CHECK constraint.

### Plurals

i18next v23+ uses `Intl.PluralRules`. Hermes on RN 0.81 may lack it. If it's
missing on device, add the `intl-pluralrules` polyfill, imported once in
`src/i18n/index.ts`. Verify this in M1 on a real Android build, not only in Jest.

## Milestones

| #  | Scope | Tests (written first) |
|----|-------|-----------------------|
| M1 | Dependencies, `src/i18n/` init + `resolveLanguage` + typed resources skeleton, Jest `lng: 'en'`, `formatDate` locales, `displayCategoryName`, income-source keys | `resolveLanguage` (override wins; `fr-CM`→fr; `de`→en), `formatDate` in fr/en, `displayCategoryName` (seeded→translated, custom→verbatim), fr/en key parity (runtime deep-key check, in addition to tsc) |
| M2 | Migration 029, `setLanguage`, `AppSettings.language`, Settings "Language" row, root-layout wiring, reminder reschedule | migration up/idempotent, service round-trip, Settings row selects & persists, layout switches language |
| M3 | Shared `components/` + `app/` layouts (tab titles, drawer, headers) + notifications config/triggers | notification copy resolves in fr |
| M4 | `auth`, `onboarding`, `dataTransfer` string extraction | one fr render smoke test per slice |
| M5 | `expenses` (largest slice: sheet, log/detail, categories, quick-add, recurring, zero-day) | fr smoke tests on Transactions + AddTransactionSheet |
| M6 | `income`, `accounts`, `debt` | fr smoke tests |
| M7 | `budget`, `dashboard`, `reports` (incl. chart labels & insights text) | fr smoke tests on Dashboard + MonthlyReport |
| M8 | Sweep for leftover literals, `/check-arch`, `code-reviewer`, KANBAN | — |

Extraction milestones are refactors under existing tests, which stay green in
English. The fr smoke tests prove each screen actually reads from the catalogue.

## Out of Scope

- Languages other than French and English.
- Translating user-entered data (custom categories, notes, account names).
- Translating the seeded account names (Cash / MTN MoMo / Orange Money are
  brand or neutral names; "Cash" → "Espèces" can follow the same display-mapping
  approach if wanted later).

## Risks

- **Size.** Every screen is touched. Merge conflicts with parallel work are
  likely, so land milestones as separate commits on one branch
  (`feat/vs-35-fr-localization`).
- **Text length.** French runs ~15–30% longer. Tight labels (tab bar, quick-log
  tiles, chips) need a visual pass in French on a small screen.
- **Tests asserting English** remain valid only because Jest pins `en`. Don't
  switch the Jest default.
