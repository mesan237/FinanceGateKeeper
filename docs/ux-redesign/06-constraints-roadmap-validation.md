# 06 — Technical constraints, roadmap, acceptance criteria, validation, decisions

Report sections 11, 12, 13 and 14.

---

## 11. Technical constraints and regression risks

### 11.1 What exists and can be reused (Verified)

| Kind | Items |
|---|---|
| Shared components (`src/components/`) | `Card`, `SectionCard`, `Pill`, `ChangeChip`, `ProgressBar` (with pace `marker`), `AnimatedCounter`, `EmptyState`, `LoadingState`, `Skeleton`, `BottomSheet`, `Modal`, `SegmentedControl`, `MonthStepper`, `WhyBreakdown`, `AttentionProvider` / `AttentionDot`, `KeyboardAvoider`, `PushedScreensStack`, `Toast` |
| Duplicates to resolve | `MonthStepper` (Budget) and `reports/NavArrows` (Reports) do the same job — earlier audit L2, still present |
| Tokens | `constants/colors.ts` + `theme/palettes.ts` (light/dark), `constants/layout.ts` (`SPACING` 4-pt scale, `RADIUS`, `SHADOW`), `constants/fonts.ts`, `Typography` variants (display 28, heading 22, subheading 16, body 15, muted 13, label 11 uppercase) |
| Cross-feature signalling | `AttentionProvider` keys (`constants/attention`) — the model for the proposed stage provider (VS-64) |
| Calculations reused as-is | `getBudgetOverview`, `budgetHealth`, `projectSpend`, `safeDailySpend`, `getCommitted`, `useCashflow` (safe to spend), `getCashOnHand`, `monthCoverage` / `getLoggedDates`, `getSpendingProfile`, `getStartingPoint`, `reasonOf`, `getNetWorthAsOf`, `getJourney` |

### 11.2 Data and business-rule dependencies

**No schema change is needed for any P0 or P1 task.** Items that touch rules, flagged explicitly:

| Change | Kind | Risk | Status |
|---|---|---|---|
| Dashboard daily caption uses `safeDailySpend` instead of `dailyBudgetPace` (D3) | Which existing figure is shown | The caption's meaning changes | Needs approval |
| Back-confirm no-spend days (D5) | New UI over existing `confirmZeroDay(date)`; **add a guard** against days with expenses | Coverage inflation if misused; a contradictory day today is possible via the service | Needs approval + test first |
| Prorate a mid-month first month (D4, option B) | Changes `monthCoverage`, therefore *complete month*, averages, starting point, journey | Shifts every history-based figure for existing data | **Not recommended now**; copy-only option A first |
| Free-cash readiness ("balances checked … ago") | Read of latest balance checks | None to figures | Presentation |
| Stable category colours | Derive from id | None | Presentation |
| Recurring-bill detection prompt (UX-28) | New inference logic | False positives | Hypothesis, P2 |

**Rule respected throughout:** no financial calculation is changed to make a screen look simpler.

### 11.3 Architecture constraints

- New shared **stage provider** in `components/` (VS-64 plan) so `budget`, `reports`, `dashboard`
  read the step without importing `journey`.
- **D-arch-1:** onboarding's wallet step — new `onboarding → accounts` edge, or navigate by path.
- **D-arch-2:** journey's current-month coverage and missed-day confirmation — duplicate a small
  SQL read in `journey`, or approve `journey → expenses`; the confirm action itself either needs the
  edge or a route by path.
- Home's *Next for you* reads approved edges only (`dashboard → budget/expenses/accounts`); debts
  due arrive through `budget.committed` (budget already reads debts by SQL).
- 300-line limit: `ExpenseEntryPanel` 260, `MonthOverviewCard` 286, `BudgetPlannerScreen` 286,
  `EnvelopeEditSheet` 294 are near it; `expenses.service.ts` (~870) and `expenses.hooks.ts` (~650)
  already exceed it — put new logic in new files (`expenses.search.ts`, etc.).
- i18n: every key in `en` and `fr`; French typed against English; Jest pins English.
- Known gotcha (project memory): the user's running Metro rewrites `.expo/types/router.d.ts`;
  regenerate typed routes before `tsc` when adding route params (`?setup=1`, `?date=`).

### 11.4 Tests

232 test files, 96 of them screen tests (`*.test.tsx`), service tests on in-memory SQLite.
Screen tests assert English copy and `testID`s, so **every vocabulary change will fail tests by
design** — the TDD rule in `CLAUDE.md` applies: update the test to the new expected copy first
(red), then the catalogue (green). Prefer asserting `testID` + key figures over full sentences
where tests are rewritten anyway.

### 11.5 Regression risks

| # | Risk | Where | Mitigation |
|---|---|---|---|
| 1 | Copy changes break many screen tests at once | all tabs | One slice per screen; grep the old string across `src/` and tests before merging |
| 2 | French drifts from English meaning | `fr/*.ts` | User reviews fr copy for each slice (native speaker) |
| 3 | `ProgressBar` gains a required label → compile errors in every caller | 10 call sites in 10 files | Optional prop first, then make required in its own commit |
| 4 | New colour tokens break dark mode | `palettes.ts` | Define every new token in both palettes; check both on device |
| 5 | Removing `PlannedDueCard` drops the only Home signal for planned purchases | Home | *Next for you* lands first; drawer dots unchanged |
| 6 | Wrong or unloaded journey step → wrong hero | Home, Budget, Reports | Fallback: plan-based hero whenever a plan exists, *Spent this month* otherwise (the P0 rule needs no step at all) |
| 7 | Back-confirmed no-spend days contradict logged expenses | `zero_days` | Guard in service + UI shows the button only for empty days; tests |
| 8 | Reports regroup loses the category → detail navigation | Reports | Keep the path-based push; test it |
| 9 | Collapsed groups hide something the user relied on | Reports, Budget | Remember the user's open/closed choice locally; default by stage |
| 10 | Stage-aware leads feel unpredictable | Home | Label always names the figure; announce the change on My path |

### 11.6 Must be preserved

Daily logging speed; quick-add, recurring auto-log, zero-day; the unified add sheet; envelopes,
rollover, cover-from-another-category, the planner's *Copy last month* / *Use my averages*;
category and subcategory detail; the Why model; provisional labels and estimate vs actual;
safe-to-spend on the Budget tab (user decision); expected-income default (user decision); goals,
reserve, pay yourself first; debts, instalments, tontines, events; net worth history; backup,
export, PIN; the journey's derived steps, skip and no re-lock; en/fr parity.

### 11.7 Where the code blocks good UX vs where it is a product decision

| Problem | Primarily |
|---|---|
| Six "spend" figures with look-alike names (F-01) | **Product/copy decision** — calculations are right, names collide |
| Stage mismatch (F-02) | **Product decision** + one small infra piece (stage provider) |
| First month can't count; no back-confirm (F-03) | **Business rule** (coverage) + **missing UI** over an existing service |
| Density (F-04, F-05) | **Design decision** |
| Contrast, colour semantics (F-08, F-09) | **Design system** gap (missing `PRIMARY_TEXT`, kind palette) |
| Category colours by rank (F-10) | **Implementation** (`colorForIndex`) |
| No search (F-17) | **Implementation** gap |

---

## 12. Prioritised implementation roadmap

Effort: **S** ≤ 1 day, **M** 2–4 days, **L** 1–2 weeks (single developer, TDD, including tests and
en/fr copy). Estimates come from the code read above, but are still estimates.
Each task is sized to become one vertical slice (feat + docs commits). I have **not** added them
to `docs/KANBAN.md`; that happens after approval (suggested numbering from VS-66).

### Phase 0 — Audit validation (no app code)

| ID | P | Problem → change | Effort | Depends / risk | Acceptance & verification |
|---|---|---|---|---|---|
| UX-00a | P0 | Decisions open → approve D1–D10, D-arch-1/2 and the vocabulary (§10.1) | S | — | Every decision has an answer recorded in this file |
| UX-00b | P0 | No baseline → run the task walkthrough (§13.2) on the **current** build | M | A device build | Times and answers recorded per task; no targets set before this |
| UX-00c | P0 | Visual claims unverified → capture every screen on Android, light/dark, default and 200% font; check contrast with a tool | S | Device | Screenshots stored with the report; F-09/F-22 confirmed or corrected |
| UX-00d | P1 | F-18 is a hypothesis → count, in the builder's own data, the share of expenses with an event, an imprévu flag, a note, a non-today date, a non-default wallet | S | Read-only SQL on a local copy | Shares recorded; D8 decided from them |

### Phase 1 — Language, stage emphasis, onboarding

| ID | P | Problem → change | Effort | Depends / risk | Acceptance & verification |
|---|---|---|---|---|---|
| UX-01 | P0 | F-01, F-14 → vocabulary pass in en/fr; sentence case; remove the duplicate *Budget left*; Reports *Planned* → *Budget*; glossary gets a "visible label" column | M | D1; risk #1, #2 | No two different figures share a key word; one figure never has two labels (checked by a table of all money labels); tests green |
| UX-02 | P0 | F-09 → `PRIMARY_TEXT` token, both palettes; replace the 35 text uses | S | risk #4 | All green text ≥ 4.5:1 on its background (tool) |
| UX-03 | P0 | F-02 → shared stage provider in `components/` (VS-64 part 1) | M | — | Budget/Reports/Dashboard read the step with no `journey` import (`/check-arch` clean) |
| UX-04 | P0 | F-01, F-02 → Home hero rule: *Spent this month + days logged* when no plan exists or step is Observe; *Left in your plan* otherwise; *Net* leaves Home | M | UX-01, UX-03; risk #6 | New user sees no budget prompt as the hero; with a plan, the hero is the plan figure; screen tests for both |
| UX-05 | P0 | F-03 → this month's logged days on the path step and journey card ("18 of 23 days · on track to count") | S–M | D-arch-2 | Numbers match `monthCoverage` for seeded months (service test) |
| UX-06 | P0 | F-03 → mark missed days (last 7) as no-spend; guard against days with expenses | M | D5, D-arch-2; risk #7 | Failing test first: a day with an expense cannot be confirmed; UI shows only empty days |
| UX-07 | P0 | F-03 → say when the first month cannot count (copy only, D4 option A) | S | D4 | Seeded user starting on the 18th sees the message; not shown for a 1st-of-month start |
| UX-08 | P1 | F-13 → replace the 4-card deck with S0–S2 set-up (what it does · wallets today · logging moment) | M | D-arch-1 | Fresh install reaches Home in ≤ 3 screens after PIN; every step skippable; skipped wallets show *not confirmed* |
| UX-09 | P1 | F-13 → split the baseline checklist by step (balances → set-up, fixed categories → See, bills/debts/estimates → Plan) | S | UX-03 | Observe shows no Plan-only checklist items |
| UX-10 | P1 | F-02 → VS-64 previews (Budget before Plan; goals, reserve, pay-yourself-first before Grow) with *Show anyway* | M | UX-03 (existing backlog item) | Nothing reachable before is unreachable after |
| UX-11 | P1 | F-01 → one daily figure on Home and Budget (D3) | S | D3 | Home caption and Budget per-day figure are equal for the same data (test) |

### Phase 2 — Core visual hierarchy

| ID | P | Problem → change | Effort | Depends / risk | Acceptance & verification |
|---|---|---|---|---|---|
| UX-12 | P1 | F-11, F-20, F-24 → Home: *Next for you* slot (+N more sheet), wallet total + "checked … ago", progress instead of static journey goal; remove planned-due card, per-wallet list, sparkline (or move it) | L | UX-04; risk #5 | Due items ordered overdue › today › soon; ≤ 4 blocks above the fold on a 360×740 dp screen (screenshot) |
| UX-13 | P1 | F-04, F-07 → Budget: captions into *How this plan is built*; *Free cash* line + subtraction sheet; envelope rows two lines, footers only when at risk | M | UX-01; approval to change the Phase 3 money-view layout | Figures before the category list ≤ 6 (count on screenshot) |
| UX-14 | P1 | F-05, F-06, F-07 → Reports: stepper first; *This month* / *Over time* / *Wealth*; Unexpected merged into Why; debt totals to Wealth | M | risk #8, #9 | Every figure above the first group heading changes when the month changes |
| UX-15 | P1 | F-08, F-10 → semantic palette: status colours only for status; `KIND_*` set; stable category colours; neutral log tiles; hero number not red | M | UX-02; risk #4 | No status colour used for a spending kind (grep); a category keeps its colour across months (test) |
| UX-16 | P2 | F-23 → one loading / empty / error pattern | S | — | Each tab shows skeleton, empty-with-action, error-with-retry (screen tests) |
| UX-17 | P2 | Hierarchy → one hero size per screen; supporting text ≥ 13; 11 px only for eyebrows | S | — | Screenshot review |
| UX-18 | P1 | F-12 → drawer *My money* / *App*; remove "Soon" rows | S | D7 | No disabled rows; money objects grouped |

### Phase 3 — Contextual insight and financial control

| ID | P | Problem → change | Effort | Depends / risk | Acceptance & verification |
|---|---|---|---|---|---|
| UX-19 | P1 | F-15 → "≈" + *heading for* on every projection; category part chips state their basis | S | UX-01 | Every projected figure carries "≈" (grep of render sites) |
| UX-20 | P1 | F-16 → one-sentence summary per chart (visible on Reports' month group, `accessibilityLabel` everywhere); ranked bars instead of the donut | M | — | TalkBack reads a meaningful sentence for each chart and bar |
| UX-21 | P1 | R10 → *Free cash* shows balance freshness and unlinked spending; *Check balances* link | S | UX-13 | With a wallet unchecked for > 30 days the note appears (test) |
| UX-22 | P2 | F-18 → *More details* for event + note; inline over-budget warning | M | UX-00d, D8 | Timed test shows fewer taps without lower imprévu/event use |
| UX-23 | P2 | F-17 → Transactions search; day header shows spending, income separately | M | new `expenses.search.ts` | Find a known expense in ≤ 15 s in test |
| UX-24 | P2 | F-02 → full stage-lead table (file 04 §7.3) incl. Reports group defaults | M | UX-03, UX-14 | Seeded users at each step see the documented lead |

### Phase 4 — Optimisation and refinement

| ID | P | Problem → change | Effort | Depends / risk | Acceptance & verification |
|---|---|---|---|---|---|
| UX-25 | P1 | Optimize step empty → VS-65 variable-cut suggestions (existing backlog) | M | UX-03 | Suggestions only on variable categories, from the starting point |
| UX-26 | P2 | Net worth looks complete when it is not → *partial* label with what is missing | S | baseline facts | Unconfirmed wallets or unanswered debts step → label shown |
| UX-27 | P1 | F-16, F-22 → accessibility hardening: reduce motion, `ProgressBar` label required, TalkBack pass, 200% font pass | M | UX-20 | Checklist §13.3 passes on device |
| UX-28 | P2 | Bills discovered late → "make it a regular bill?" prompt from repeats | L | Hypothesis; new inference | False-positive rate checked on the builder's data first |
| UX-29 | P0 (of phase) | Re-run §13.2 on the new build | M | all above | Compared with UX-00b results; findings recorded |

**Suggested slice order:** UX-00a–d → UX-01 + UX-02 → UX-03 → UX-04 → UX-05/06/07 → UX-11 →
UX-08/09 → UX-10 → UX-13 → UX-14 → UX-12 → UX-15 → UX-18 → Phase 3 → Phase 4.
UX-01 first because nearly every later task depends on the vocabulary.

### 12.1 Release cut (public release in a few weeks, decided 2026-10-24)

A first-time stranger, not the builder, will be the first user, so first-run comprehension and
basic accessibility move up. **Must ship before release:**

| Order | Task | Why it moves up |
|---|---|---|
| 1 | UX-01 vocabulary (+ drop *Budget left*) | Wrong reading of the main figure is the top trust risk |
| 2 | UX-02 contrast token | A public app should not fail WCAG AA on its links |
| 3 | UX-18 drawer regroup, remove "Soon" rows (P1 → **P0**) | Disabled placeholders look unfinished to strangers |
| 4 | UX-04 Home hero rule (P0 version, no stage provider needed) | Day-one screen must not contradict Observe |
| 5 | UX-05, UX-06, UX-07 Observe feedback (uses the approved `journey → expenses` edge) | New users all start in Observe, most mid-month |
| 6 | UX-08 onboarding set-up (P1 → **P0**) and UX-09 checklist split | The tutorial deck is every stranger's first impression |
| 7 | UX-11 one daily figure | Small; completes F-01 |
| 8 | UX-16 shared states (P2 → **P1**) | Strangers hit empty and error states first |

**Should ship if time allows:** UX-03 + UX-10 (stage provider, previews), UX-13 (Budget), UX-14
(Reports), UX-15 (colour semantics). **After release:** Phases 3–4, re-run of the validation (UX-29).

UX-00b/c (baseline walkthrough and device screenshots) should still run first — even one
session with one outside person before release is worth more than none.

---

## 13. Acceptance criteria and validation strategy

### 13.1 Success measures

No baseline exists, so **no target number is set before UX-00b.** Direction of change and
method only:

| Measure | Method | Better means |
|---|---|---|
| Time to identify what the plan still allows | Timed task T1 | Shorter |
| Correct explanation of the main figures (hero, free cash, per-day) | Comprehension questions, scored correct / partial / wrong | More correct |
| Correct "can I buy this?" decision | Task T2 with a seeded month where plan and free cash disagree | More correct, and names the right figure |
| Time to find a specific expense | Task T3 | Shorter |
| Naming the month's two biggest drivers | Task T4 on Reports | More correct |
| Onboarding completion and time | Fresh install, observed; skip use noted | Completed, ≤ 2 min |
| Steps to log a minimal expense | Count taps | Fewer or equal (never more) |
| Logged-day coverage | The app's own metric, 30 days before vs after for the builder | Higher (n = 1: indicative only) |
| Misunderstandings caused by labels | Count of wrong readings in comprehension questions | Fewer |
| Accessibility | §13.3 checklist | All pass |
| Confidence | "I know where my money stands this month" 1–5, after the tasks (inspired by the CFPB *feeling in control* element, R15 — not the CFPB scale) | Higher |

### 13.2 Validation plan (practical without a research budget)

- **Participants:** the builder, plus 3–5 people resembling the target user (salaried and/or
  irregular income, cash + mobile money, FCFA, francophone and anglophone). Five is a planning
  number, not a statistical claim.
- **Format:** 30-minute moderated session on an Android device, think-aloud, seeded data, no
  coaching. Run once on the current build (UX-00b), once after Phases 1–2, once at the end.
- **Seeded scenarios** (a test seed script, kept out of production):
  1. *Observer:* day 18 of their second month, first month started on the 18th, 3 missed days.
  2. *Planner over in one category:* Plan step, Transport over budget, plan left positive, free
     cash negative because a tontine and rent are due.
  3. *Irregular earner:* plan on expected income 250,000, 150,000 received.
- **Tasks:** T1 "How much can you still spend this month under your plan?" · T2 "A friend asks to
  borrow 20,000 today. Can you?" · T3 "Find the taxi you took last Tuesday" · T4 "What drove
  last month's spending?" · T5 "Log 1,500 for bread from Orange Money" · T6 "What should you do
  next in the app?" · T7 (fresh install) set up the app.
- **5-second test** on Home: show for 5 s, ask what the big number means.
- **Heuristic review** (Nielsen's 10) and **cognitive walkthrough** of J1, J2, J4 by me on each new
  build, labelled as expert review, not user evidence.

### 13.3 Accessibility checklist

All text ≥ 4.5:1, large text and UI parts ≥ 3:1 (tool, both themes) · no meaning by colour alone ·
TalkBack names every button, chart and progress bar with its subject · 200% font: no clipped
figure, no overlapping row · reduce-motion respected · touch targets ≥ 44 dp · all strings in
French fit their containers.

---

## 14. Open questions, assumptions, and decisions

### 14.0 Decisions recorded (2026-10-24)

| # | Decision |
|---|---|
| Public release | **Still a goal, in a few weeks.** Roadmap re-cut for it in §12.1 |
| D1–D10 | **Approved as recommended** (table 14.1). D8 stays conditional on UX-00d's data |
| D10 | Copy written for a non-expert (confirmed by the release) |
| D-arch-2 | **Approved: option (a), new edge `journey → expenses`** (this month's logged days, missed-day confirmation). Add it to the approved list in `CLAUDE.md` with the slice that uses it |
| Money view | **Approved: drop the repeated *Budget left*** (UX-13; can ship with UX-01) |
| D-arch-1 | Not answered. Option (b), open Accounts by path, turned out impossible: the onboarding gate renders before the navigator exists. Built instead (VS-72) by having the routing layer inject the accounts wallet step and the auth reminder step into the gate — still no new edge |

### 14.1 Decisions requiring approval

| # | Question | Options | Recommendation |
|---|---|---|---|
| **D1** | Names for the plan figure and the cash figure | (a) *Left in your plan* + *Free cash*; (b) *Left in your plan* + keep *Safe to spend* (rename only *Safe daily spend*); (c) keep all | **(a)**; (b) acceptable — the must-have is that the plan figure stops saying "Left to spend" and the two *safe* labels stop colliding |
| **D2** | Stage-aware Home hero | (a) P0 rule: no plan/Observe → *Spent this month + days logged*, else plan left; (b) full table 04 §7.3; (c) no change | **(a) now, (b) later** |
| **D3** | One daily figure | (a) Budget's remaining ÷ days left everywhere; (b) keep both with distinct names | **(a)** |
| **D4** | Mid-month first month | (a) explain it (copy); (b) prorate coverage from the first-use day (rule change) | **(a)**; (b) only as its own slice with tests across averages |
| **D5** | Back-confirm no-spend days | (a) last 7 days, empty days only; (b) any past day; (c) not at all | **(a)** |
| **D6** | Reports order | (a) Month · Over time · Wealth; (b) current | **(a)** |
| **D7** | Drawer | (a) *My money* / *App*, no "Soon" rows, *Accounts* → *Wallets*; (b) a Money hub tab; (c) current | **(a)** |
| **D8** | Expense form | (a) event + note behind *More details*; (b) current | Decide after UX-00d |
| **D9** | Colour semantics | (a) status colours only for status, neutral kinds, neutral log tiles; (b) current | **(a)** |
| **D10** | Audience for copy | (a) a non-expert; (b) the builder only | **(a)** |
| **D-arch-1** | Onboarding wallet step | (a) approve `onboarding → accounts`; (b) open Accounts by path | **(b)** first; (a) if the round-trip feels clumsy |
| **D-arch-2** | Journey coverage + missed-day confirmation | (a) approve `journey → expenses`; (b) SQL read in `journey` + confirm via a route by path | **(a)** — the duplication in (b) is a second definition of "logged day" |
| — | Change the Phase 3 money-view layout (drop *Budget left*, show the subtraction) | yes / no | **Yes** (UX-13) |

### 14.2 Assumptions (to test, not to rely on)

- The user's daily question is "am I OK / what can I still spend", not "what is my net worth".
- Mixed plan and cash figures are a source of confusion (F-01) — likely, but no observation yet.
- The Observe step causes drop-off when progress shows 0 for weeks (F-03).
- *Event* and *Note* are used on a minority of expenses (F-18).
- Red on the expense tile and over-budget hero discourages opening the app in bad months (R9).
- Five 30-minute sessions will surface the main comprehension problems.

### 14.3 Verified vs recommended vs hypothesis — quick key

- **Verified:** every finding's *Evidence* paragraph in file 02 (with file:line).
- **Recommendation:** every *Proposed change*, the IA, onboarding and roadmap.
- **Hypothesis:** the needs table (01 §6), 14.2, and anything marked so in the text.

### 14.4 Questions for you

1. Is a public release still a goal? It decides D10 and how much copy explanation is needed.
2. Are you happy to review all French wording yourself, or should proposals be written French-first?
3. Can you run a device build for UX-00b/c, and do you know 3–5 people who would try the tasks?
4. Should these tasks go onto `docs/KANBAN.md` as VS-66 onward once approved?
