# 05 — Concrete screen-by-screen redesign proposals

Report section 10. Every proposal names the finding it answers (F-xx, file 02), the evidence
(R-xx, file 03), the change, the expected effect, and its dependencies. Wireframes are **text
sketches of proposed layouts**, not captures of the current app (I could not run it).
Amounts in wireframes are invented examples.

Two foundations come first, because every screen uses them: the vocabulary (§10.1) and the
visual system (§10.2).

---

## 10.1 One vocabulary (answers F-01, F-14)

Each figure gets **one visible name, in English and French, used on every screen**. French
wording is a proposal for the user to correct (native speaker).

| Glossary term (unchanged) | Today's labels | Proposed label (en) | Proposed label (fr) | One-line hint shown on first use / in sheets |
|---|---|---|---|---|
| Budget remaining | *Left to spend*, *Budget left* · *Reste à dépenser*, *Reste du budget* | **Left in your plan** | **Reste au budget** | "What your plan still allows this month. Not the cash in your wallets." |
| Safe to spend | *Safe to spend* · *Disponible à dépenser* | **Free cash** (D1; alt. keep *Safe to spend*) | **Argent libre** | "Cash in your wallets that no bill, goal, debt or tontine is waiting for." |
| (per-day plan figure) `safeDailySpend` | *Safe daily spend* · *Dépense sûre par jour*; Dashboard *daily pace* (other formula) | **A day to stay on plan** | **Par jour pour tenir le budget** | "What is left in your plan, shared over the days left." |
| Committed money | *Committed* · *Engagé* | **Due before month end** | **À payer d'ici fin du mois** | "Bills, planned purchases, debts and tontines still to pay this month." |
| Unassigned | *{{amount}} unassigned* · *non réparti* | **{{amount}} to share out** | **{{amount}} à répartir** | "Give it a job before you spend it." (kept) |
| Unbudgeted income → leave | *Leave unassigned* | **Keep it aside** | **Le garder de côté** | — |
| Projected spend | *On this pace*, *ends ~X* | **Heading for ≈ X** | **En route vers ≈ X** | "If the rest of the month goes like so far." |
| Month income − spend | *Net* (Dashboard) | (removed from Home) Reports: **Income − spending** | **Revenus − dépenses** | — |
| Month budget (Reports) | *Planned* · *Prévu* | **Budget** | **Budget** | — |
| Report section | *Expense Performance* | **The month against your plan** | **Le mois face au budget** | — |
| Expense note | *Description* / *Note (optional)* / a11y *Note* | **Note** | **Note** | — |

Rules: sentence case everywhere (*Today's spending*, *Spending by category*, *Log expense*);
"≈" marks every projected or estimated amount; the word *estimate* marks every user-typed figure.
Add a "Visible label" column to `docs/finance-gatekeeper-audit/GLOSSARY.md` so code, copy and docs
stay aligned.

**Dependencies:** en + fr catalogues; screen tests that assert these strings; `GLOSSARY.md`.
No calculation changes, except D3 (below).

**D3 — one daily figure.** The Dashboard caption uses `dailyBudgetPace` = budget ÷ days in month
(`dashboard.service.ts:80`); the Budget uses `safeDailySpend` = remaining ÷ days left
(`budget.progress.ts:80`). Recommend the Dashboard reuse the Budget's figure (already computed in
`getBudgetOverview`, which the Dashboard already calls). This changes what the Home caption
*means* — needs approval.

---

## 10.2 Visual system (answers F-08, F-09, F-10, F-15, F-16, F-21, F-22)

| Element | Today (Verified) | Proposal | Why |
|---|---|---|---|
| **Status colours** | `SUCCESS/WARNING/DANGER` used for status *and* for spending kinds | Reserved for status only: on track / watch out / over, and good/bad change chips | R5: don't reuse colours for different variables |
| **Spending-kind colours** | Variable = `SUCCESS`, Everyday = `SUCCESS`, Unexpected = `WARNING`, Routine/Fixed = grey, Event = near-black | New neutral `KIND_*` set (e.g. slate for fixed/routine, blue for variable/everyday, violet for events, amber-brown for unexpected) — always with text labels | "Everyday — habits you can change" should not read as "good" |
| **Category colours** | By rank in the month (`colorForIndex`) | Stable per category (hash of id into the palette, or stored) | Same category, same colour every month |
| **Brand green as text** | `PRIMARY_GREEN #10b981` text ≈ 2.5:1 on white, 35 uses | New `PRIMARY_TEXT` (darker emerald, ≥ 4.5:1 on white and `PRIMARY_LIGHT`), used for all green text; `PRIMARY_GREEN` stays for fills, FAB, active tab | WCAG 1.4.3 (R11) |
| **Expense log tile** | `DANGER_LIGHT` / `DANGER_TEXT` | Neutral surface tile with brand-tinted icon; income tile the same, arrow direction carries meaning | Logging is the wanted habit (R9 hypothesis) |
| **Over-budget hero** | Hero number turns `DANGER` red at 34 px | Number stays `TEXT_PRIMARY`; the label says *Over your plan by*; the chip carries the status colour | Fact first, colour as secondary cue |
| **Projected / estimated figures** | Same style as facts; `~` in one place | "≈" prefix + `TEXT_SECONDARY`; phrase *heading for*; chips name their basis | R8 |
| **Hierarchy** | Many 13–15 px figures, 11 px uppercase labels | One hero figure per screen (34 px); section figures 16–20 px; body 15; supporting ≥ 13; 11 px uppercase only for short section eyebrows | R1 #8 salience |
| **Charts** | Donut by angle; no accessible names; bars with role but no label | Ranked horizontal bars for category shares; each chart has a one-sentence summary (visible where it states the conclusion, `accessibilityLabel` always); `ProgressBar` takes a required `accessibilityLabel` | R5, R7, R11 |
| **Journey status** | done and current both `success` | Current = brand accent + "You are here"; done = quiet check in muted text | F-21 |
| **Motion** | `AnimatedCounter` always animates | Skip the count when *reduce motion* is on (`AccessibilityInfo.isReduceMotionEnabled`) | Accessibility |
| **States** | Different per screen (F-23) | Shared: skeleton while loading; `EmptyState` with one action; error card with *Retry* | R16 consistency |

**Dependencies:** `src/constants/colors.ts` + `src/theme/palettes.ts` (light and dark),
`categoryColors.ts`, `WhyBreakdown`, `TypicalMonthCard`, `MonthlyReport`, `QuickActionBar`,
`ProgressBar` (API change → every caller), snapshot-free tests mostly unaffected; any test
asserting colours will need updating. Contrast values must be verified with a tool on device.

---

## 10.3 Home (today: Dashboard) — F-01, F-02, F-11, F-20, F-24

**Current (Verified, `DashboardScreen.tsx:95-136`).** Date · Month overview (month, days left,
*Left to spend*, bar, spent of budget, %, pace chip, In/Out/Net, unexpected line) · Quick log
(Expense red, Income green, *I spent nothing today*) · Journey card (step, title, static goal,
5 segments) · Planned-due card · Wallets (one row per wallet) · Today's spending (+ pace caption
+ 7-day sparkline).

**Problems.** Six figures that sound like "what I can spend" (F-01); budget-first while the path
says observe (F-02); attention items split across cards in code order (F-20); no wallet total or
freshness (F-11); static journey sentence (F-24).

**Proposed hierarchy, Observe step** (and any time no plan exists):

```
┌──────────────────────────────────────┐
│ ☰               Home                 │
├──────────────────────────────────────┤
│ October · 8 days left                │
│                                      │
│ SPENT THIS MONTH                     │
│ 157,500 FCFA                         │  ← hero: a fact, no limit implied
│ 18 of 23 days logged · on track      │  ← coverage, the Observe goal
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░  (days, not money)│
│ Today 2,500                          │
│                                      │
│ [ ↓ Expense ]   [ ↑ Income ]         │  ← neutral tiles
│        I spent nothing today         │
│                                      │
│ NEXT FOR YOU                         │
│ Nothing logged on Tuesday            │
│   [No spending]  [Add an expense]    │  ← one item, most urgent first
│ + 1 more ›                           │
│                                      │
│ Wallets            128,000 FCFA  ›   │  ← total + freshness
│ checked 3 days ago                   │
│                                      │
│ My path · Observe · 1 of 3 months ›  │  ← progress, not the static goal
└──────────────────────────────────────┘
```

**Proposed hierarchy, Plan step onward:**

```
│ October · 8 days left                │
│ LEFT IN YOUR PLAN          [On track]│
│ 42,500 FCFA                          │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░|░░  | = where you'd be│
│ 157,500 of 200,000 spent             │
│ ≈ 5,300 a day to stay on plan        │
│ Planned on expected income ·         │  ← only for an expected-income plan
│ 150,000 of 250,000 received          │
│ Today 2,500                          │
│ [ ↓ Expense ]   [ ↑ Income ]  …      │
│ NEXT FOR YOU                         │
│ Tontine "Bureau" · 10,000 due Friday │
│ + 2 more ›                           │
│ Wallets 128,000 FCFA · checked 3 d › │
│ My path · Plan · step 3 of 5 ›       │
```

**On demand:** *+ N more* opens a sheet listing every due item (planned purchases, recurring
bills not yet logged, debt instalments, tontine contributions) by date; the wallet line opens
Accounts.

**Removed from Home:** *Net* (Reports has it), the separate Planned-due card (absorbed into
*Next for you*), the per-wallet list (Accounts), the sparkline (moves to Transactions header or is
dropped — decision in Phase 2), the static journey goal sentence.

**Expected improvement.** One unambiguous figure; the screen agrees with the path; urgent items
ordered by urgency. Testable with a 5-second test (file 06 §13).

**Dependencies.**
- Stage: VS-64's shared step provider (`components/`), so `dashboard` reads the step without a
  new import (dashboard → journey is approved anyway).
- *Next for you*: AttentionProvider today publishes planned and tontine counts (Verified); debt
  instalments and recurring bills due need publishing too (the counts come from
  `budget.committed`, which dashboard may read — approved edge). Missed logging days need
  `expenses.coverage` (approved edge `dashboard → expenses`).
- Wallet total: `accounts.balance.getCashOnHand` (approved edge `dashboard → accounts`). Freshness
  needs the latest check date per wallet (`accounts.checks`) — a read, no schema change.
- "Today" line reuses `todaySpending`. Days-logged reuses `monthCoverage`.
- Tests: `DashboardScreen`, `MonthOverviewCard`, `QuickActionBar`, `TodaySpendingCard`,
  `WalletsCard`, `PlannedDueCard` screen tests.

---

## 10.4 Budget tab — F-01, F-04, F-07, F-15

**Current (Verified, `BudgetOverview.tsx`).** Month stepper · Hero (11 possible figures) ·
Surplus card · *Your money now* (budget left, cash, goal cash, committed + parts, safe to spend,
shortfall) · Unassigned strip · Categories card (6 figures per row) · Insights (collapsed).

**Proposed:**

```
┌──────────────────────────────────────┐
│        ‹  October 2026  ›            │
│ LEFT IN YOUR PLAN       [Watch out]  │
│ 42,500 FCFA                          │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░|░░                    │
│ 157,500 of 200,000 · ≈ 5,300 a day   │
│ Heading for ≈ 214,000 by month end   │  ← only when over or at risk
│ How this plan is built ›             │  ← sheet: expected income, set aside, carried over
│                                      │
│ ┌ 12,000 to share out ─── Assign › ┐ │  ← one action strip: unassigned OR surplus
│ └──────────────────────────────────┘ │
│                                      │
│ FREE CASH          31,000 FCFA    ›  │  ← one line; sheet holds the breakdown
│ balances checked 3 days ago          │
│                                      │
│ CATEGORIES                Edit plan  │
│ 🍲 Food                 8,000 left   │
│ ▓▓▓▓▓▓▓▓░|░░                         │
│ 🚕 Transport          2,000 over [!] │
│ ▓▓▓▓▓▓▓▓▓▓▓  heading for ≈ 30,000    │  ← footer only when at risk/over
│ 💡 Bills                    0 left ✓ │
│ …                                    │
│ Insights                      Show   │
└──────────────────────────────────────┘
```

**Free-cash sheet (one level deep):** Cash in wallets 128,000 · of which in goal wallets
−40,000 · due before month end −57,000 (bills 30,000 · planned 12,000 · debts 10,000 · tontines
5,000) · **= Free cash 31,000**. If negative: "What is due by month end is 9,000 more than the
cash outside your goals." (existing copy, kept). Shown as an explicit subtraction so the user can
check the arithmetic (R6 offload, R10 trust).

**Changes in detail.**
- Remove the duplicate *Budget left* (F-07). *Your money now* keeps its three ideas (the user's
  Phase 3 decision) — plan, cash, due — but the plan figure is the hero above, so the card shows
  cash and due as the subtraction that makes *Free cash*. **Approval needed** because it changes a
  decided layout.
- Hero captions (expected income, set aside, carried) move to *How this plan is built*, except
  the expected-income line when received < expected (it explains a plan that exceeds cash).
- Envelope rows: two lines; `usedPerDay`, `endsAround`, `rollsOver` shown only when the envelope is
  at risk / over, or in the category detail. Rollover becomes a small icon with an accessible label.
- *On this pace* stat → *Heading for ≈ X*, shown only when it exceeds the plan.

**Expected improvement.** From ~20 figures before the list to ~5; daily question answered in
the first block. Insight remains reachable in one tap.

**Dependencies.** Presentation only. `MoneyViewCard`, `BudgetHeroCard`, `CategoryEnvelopeRow`
(also used inside category detail — keep its full mode there via a prop), screen tests.
Balance freshness: needs a read of latest checks via `accounts` (budget → accounts approved).

---

## 10.5 Category detail — F-15

**Current:** already question-led (envelope + vs usual → where → why → next month →
transactions). Keep the structure.

**Changes.**
- Part chips say their basis: *"≈ +40% vs usual, on this pace"* in the accessible label and a
  "≈" in the chip when the month is running (`CategoryDetailSections.tsx:90-95`).
- The envelope row here keeps its full detail (it is the drill-down).
- Next-month card: lead with the action (*Use 45,000 next month*), explanation below.

**Dependencies:** presentation only; `CategoryDetailSections` tests.

---

## 10.6 Reports — F-05, F-06, F-07, F-10, F-16

**Current order (Verified):** Net worth · Typical month · Estimate vs actual · *month stepper* ·
Income/Expenses · Expense performance · Unexpected · Why · Donut + categories · Debt · vs previous
month · Weekly link.

**Proposed:**

```
┌──────────────────────────────────────┐
│        ‹  September 2026  ›          │  ← first; scopes the "This month" group
│ THIS MONTH                           │
│ Spent 182,000 · Income 250,000       │
│ Budget 200,000 · 18,000 under        │
│ "Food and Transport were 58% of your │  ← text summary: the conclusion (R5)
│  spending. Unexpected: 3 · 12,000."  │
│                                      │
│ Why you spent  ▬▬▬▬▬▬▬▬▬▬            │
│  Routine 70,000 · Events 20,000 ·    │
│  Unexpected 12,000 (Aug: 2 · 8,000)  │  ← Unexpected card merged here
│  Everyday 80,000                     │
│                                      │
│ By category (ranked bars, stable     │
│ colours, each opens detail)          │
│  Food       ████████████  62,000     │
│  Transport  ███████       44,000     │
│  …                                   │
│ Biggest changes vs August (top 3) ›  │
│                                      │
│ OVER TIME · last complete months   ▾ │  ← collapsed until See; opened from See on
│  Your typical month vs starting point│
│  Your estimates vs what happened     │
│                                      │
│ WEALTH                             ▾ │  ← collapsed until Grow
│  Net worth 612,000 · +18,000         │
│  Savings rate 27% · History ›        │
│  Lent out 30,000 · Owed 15,000       │  ← debt totals are "as of today", so here
│                                      │
│ Weekly report ›                      │
└──────────────────────────────────────┘
```

**Why this order.** The stepper scopes what is directly below it (F-06). The month group answers
the monthly-review question; *Over time* answers "what does a month cost me"; *Wealth* is the
Grow stage. One disclosure level (R2). Debt totals are not month-specific (CURRENT_STATE noted
this), so they move to *Wealth*, labelled *as of today*.

**Donut decision (Phase 2).** Replace with ranked bars (R7: length beats angle), or keep as a
visual with `accessibilityElementsHidden` and the bars as the readable version. Recommend replace.

**Dependencies.** `MonthlyReport` reorganisation; `UnplannedCard` merged into `WhyBreakdown` via
an optional "previous month" prop (shared component change — also renders on category detail);
`MonthComparison` limited to top 3 with *Show all*. Text summary: a pure function over the
existing report data (new, testable). Collapsed state per group: stage-aware default + remembered
choice (local preference). Tests: `MonthlyReport` and card tests.

---

## 10.7 My path — F-03, F-13, F-21

**Proposed, Observe step:**

```
│ Control comes step by step.          │
│ ① OBSERVE — You are here             │
│ Log everything for 3 complete months.│
│ ▓▓▓▓▓░░░░░  1 of 3 months            │
│ This month: 18 of 23 days logged     │
│ ✓ on track to count (needs 25 of 31) │
│ Missed days                          │
│  Tue 14  [No spending] [Add expense] │  ← back-confirm, last 7 days (D5)
│  Sat 11  [No spending] [Add expense] │
│ ℹ A month counts once 80% of its days│
│   are logged.                        │
│ ② See      🔒 Unlocks after Observe  │
│ ③ Plan     🔒 …        Skip to Plan  │
│ ④ Optimize 🔒                        │
│ ⑤ Grow     🔒                        │
```

**Mid-month start (D4, copy-only version):** "October started on the 18th for you, so it can't
reach 80%. It still counts for your habits — your first full month is November."

**Changes.** Current-month coverage on the step (data exists: `monthCoverage`); missed-day
back-confirmation using `confirmZeroDay(date)` (service already accepts a date); distinct
"You are here" style; the baseline checklist split by step (file 04 §8.3) instead of five items on
top from day one.

**Dependencies.**
- Current-month coverage: `journey.service` already queries the database directly
  (`import { query } from '@/services/database'`, Verified), the same "read by SQL, not by
  importing" pattern other slices use. It can count logged days from `expenses` and `zero_days`
  without a new edge — but it would duplicate `expenses.coverage.getLoggedDates`. Either accept
  that small duplication or approve a `journey → expenses` edge. **Decision (D-arch-2).**
- Back-confirm: the missed-day buttons render inside `journey`, but confirming is an `expenses`
  write, so `journey` would need `expenses` (D-arch-2 again), or the buttons open a route by path
  (e.g. `/expenses/log?date=…` with a *No spending* option). The existing hook passes no date
  (`expenses.hooks.ts:641`); the service accepts one (`expenses.service.ts:841`).
- **Guard needed (Verified gap):** `confirmZeroDay` inserts with `INSERT OR IGNORE` on the date and
  does **not** check for expenses that day, so a back-confirmation could mark a day "no spending"
  that has expenses. Offer the button only for days with no expense, and add the check in the
  service (a small business-rule addition — needs a test first). There is also no way to undo a
  zero-day confirmation; back-confirming makes that gap more visible.
- D5 decides the window (recommend the last 7 days).

---

## 10.8 Add-expense sheet — F-18

```
│ Expense | Income | Templates         │
│        2,500 FCFA                    │
│ Category   Transport › Taxi        › │
│ Wallet     Cash ▾     Date  Today ▾  │
│ ○ Unexpected — didn't see it coming  │
│ More details (event, note)         ▾ │
│ ⚠ This puts Transport 1,500 over its │  ← inline, only when it applies
│   budget.                            │
│ [            Save            ]       │
```

**Change.** Event and note behind *More details* (auto-open when editing an entry that has them);
date as a compact chip; the over-budget modal becomes an inline warning that appears on the first
Save tap, and the second tap saves (one less dialog). **Only after the timed test** in file 06 §13
shows a gain, because *Unexpected/Event* data quality feeds the Why model.

**Dependencies.** `ExpenseEntryPanel` (260 lines — near the 300 limit; extract the "More details"
block), `OverBudgetAlert` usage, screen tests for the log/detail/quick-add screens (which share the
pre-save checks).

---

## 10.9 Transactions — F-17

Search field (note, category, amount) above the chips; day header shows *spent* with income as a
separate "+" figure; the sparkline (if kept) as a compact header. **Dependencies:** a search query
in `expenses.service` (it is 870 lines — over the limit; put search in a new
`expenses.search.ts`), `TransactionList` tests.

---

## 10.10 Drawer — F-12

```
│ Finance Gatekeeper  v1.x             │
│ MY MONEY                             │
│  Wallets · Goals · Debts · Tontines •│
│  Planned purchases • · Events        │
│ APP                                  │
│  Categories · Preferences            │
│  Backup & restore · Export & import  │
│  Feedback                            │
```

"Soon" rows removed until built. **Dependencies:** `AppDrawerContent` config only; label
*Accounts* → *Wallets* matches Home and the glossary (decision, minor).

---

## 10.11 Onboarding — F-13

S0 (what this app does + the five steps strip) → S1 (wallets and what they hold today, skippable)
→ S2 (logging moment + notification permission, skippable) → Home in the Observe state. Full table
in file 04 §8.2. **Dependencies:** `onboarding` slice; D-arch-1 for the wallet step; `users.
onboarding_complete` unchanged; existing users never see it again (flag already set).
