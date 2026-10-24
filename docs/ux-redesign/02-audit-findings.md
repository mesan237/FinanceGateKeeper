# 02 — Detailed UX and visual audit findings

Report section 4. Each finding has a stable ID used in the proposals (file 05) and the
roadmap (file 06). Severity: **Critical** (risks wrong financial decisions or loss of trust),
**High** (blocks comprehension or the journey), **Medium** (adds effort or confusion),
**Low** (polish). Research references (R-numbers) point to [03-research.md](03-research.md).

Paths are relative to the repository root.

---

## A. Information hierarchy and cognitive load

### F-01 · Critical · "How much can I spend?" has six answers with overlapping names

**Evidence (Verified).**

| Label the user sees | Screen | What it is | Source |
|---|---|---|---|
| *Left to spend* / *Reste à dépenser* | Dashboard hero | Budget available − month spend (**plan figure**) | `src/features/finance/dashboard/MonthOverviewCard.tsx:88`, `dashboard.service.ts:112-123` |
| *Left to spend* / *Reste à dépenser* | Budget hero | Same figure | `src/features/finance/budget/BudgetHeroCard.tsx` |
| *Budget left* / *Reste du budget* | Budget → *Your money now* | **The same number again**, under another name, on the same screen | `src/features/finance/budget/BudgetOverview.tsx:108` passes `budgetLeft={overview.remaining}` |
| *Safe to spend* / *Disponible à dépenser* | Budget → *Your money now* (4th figure of the 3rd card) | Cash − goal cash − committed (**cash figure**) | `budget.cashflow.hooks.useCashflow`; glossary |
| *Safe daily spend* / *Dépense sûre par jour* | Budget hero stat row | Budget remaining ÷ days left (**plan figure per day**) | `src/features/finance/budget/budget.progress.ts:80` |
| *Within/Over your daily pace of X* | Dashboard → Today's spending | Budget ÷ **all** days in the month (a different daily figure) | `src/features/finance/dashboard/dashboard.service.ts:80-84` |

Plus the Dashboard's *Net* (month income − spend) and the wallet balances listed without a total.

**Why it burdens the user.** The glossary itself says *Budget remaining* is "a plan figure, not
money. It says nothing about what is in the wallets" (`docs/finance-gatekeeper-audit/GLOSSARY.md`).
The UI labels it with the phrase people read as money. "Safe daily spend" (plan) and "Safe to
spend" (cash) share their key word and measure different things; in French, *Reste à dépenser*
and *Disponible à dépenser* are near-synonyms. The two daily figures disagree by construction
whenever spending has not been even. A user trying to decide whether to buy something must work
out which of six numbers applies — the mental combination the brief warns about.

**Principles.** Make important information salient by removing what competes with it (R1 #8);
build on existing mental models (R6); a figure that is not trusted is useless — Simple's
safe-to-spend lesson (R10).

**Proposed change.** One name per figure, used identically everywhere (en + fr); one figure per
question; remove the duplicate. See file 05 §Home and §Budget, Decision D1/D3.

**Expected improvement.** A user can say in one sentence what the big number means and which
number to use for "can I buy this?" (testable, file 06 §13).

**Dependencies.** Copy (en/fr), `GLOSSARY.md`, screen tests asserting the strings. D3 changes
which existing function feeds the Dashboard's daily caption — no new calculation, but a visible
semantic change; needs approval.

---

### F-02 · Critical · Screens speak from different stages of the journey at the same time

**Evidence (Verified).**

- My path step 1: *"Observe — Log everything for 3 complete months, without changing your
  habits."* (`src/i18n/locales/en/journey.ts`).
- Onboarding panel 2: *"Budget by category — Give each category a monthly envelope…"*
  (`src/i18n/locales/en/onboarding.ts`).
- Dashboard hero with no budget: *"— FCFA · Set a monthly budget to track this"*
  (`MonthOverviewCard.tsx:132-137`). With a budget, every expense can raise an over-budget modal
  (`ExpenseEntryPanel.tsx` `handleSave`).
- Reports opens with **Net worth and savings rate** (`MonthlyReport.tsx:62`) — the *Grow* step.
- Goals, the emergency reserve and pay-yourself-first are fully live from day one.

**Why it burdens the user.** The path asks for observation; the rest of the interface asks for
control and optimisation. A new user receives three different instructions on the first day.
The VS-34 history shows the opposite failure too (hiding budgeting made the app look empty);
the right answer is *emphasis*, not hiding.

**Principles.** Staged disclosure suits tasks with distinct steps (R2); reduce clutter without
reducing capability (R1 #6); provide flexible pathways — skip ahead allowed (R1 #3).

**Proposed change.** Stage-aware emphasis: each screen reads the current step (already computed)
and decides what *leads*. Nothing disappears; content for later steps is a one-line preview
("Unlocks when…, Show anyway") — exactly the approved VS-64 model, extended to Home's hero and
Reports' order. File 04 §7, file 05.

**Dependencies.** VS-64's shared step provider in `components/` (so slices do not import
`journey`). No calculation changes.

---

### F-03 · High · The Observe step is long and gives almost no short-term feedback

**Evidence (Verified).**

1. A month is complete at ≥80% of **all** its days logged (`src/features/finance/expenses/expenses.coverage.ts:33-46`,
   `coverage = logged / daysInMonth`). Someone who starts on the 8th of a 31-day month can log at
   most 24 days = 77%: **their first month can never count**. Nothing tells them.
2. A no-spend day can only be confirmed for **today**: the only callers of
   `confirmZeroDay` pass no date (`expenses.hooks.ts:641`) or today (`ZeroDayGate.tsx:63`),
   although the service accepts any date (`expenses.service.ts:841`). One forgotten evening
   costs a day of coverage permanently, unless the user invents an expense.
3. The path card and step show only *"{{recorded}} of 3 complete months"*
   (`JourneyStepDetail.tsx:35`). The current month's progress (days logged so far) is shown only
   on Reports' Typical-month card, and only while no month is complete.

**Why it burdens the user.** Realistically, Observe lasts 3–4 calendar months during which the
visible progress number stays at 0 for 4–8 weeks. **Hypothesis:** this is where a diligent user
gives up, and where an undiligent one never learns they are falling short.

**Principles.** Learning by doing with early visible results (R1 #1); feedback loops in habit
formation (Interpretation).

**Proposed change.** Show this month's logged days (e.g. *"18 of 24 days logged — on track to
count"*), let the user mark missed recent days as no-spend (D5), and say plainly when the first
month cannot count (D4). File 05 §My path.

**Dependencies.** Presentation + existing service for (2). (1) as copy needs no rule change;
**prorating the first month is a business-rule change** to `monthCoverage` and every average that
depends on it — flagged, not recommended without a decision.

---

### F-04 · High · The Budget tab gives about twenty figures equal weight before the category list

**Evidence (Verified, counts are maxima when every condition is true).** Hero: remaining, spent,
available, %, expected vs received (2), set aside, carried, days left, safe daily, projection
(`BudgetHeroCard.tsx:61-115`) → **11**. Surplus card: 1. *Your money now*: budget left (duplicate),
cash, goal cash, committed, up to 4 committed parts, safe to spend, shortfall
(`MoneyViewCard.tsx`) → **up to 10**. Unassigned strip: 1. Then each envelope row: spent, available,
remaining, meter + pace marker, % used, per day, *ends ~*, *rolls over* (`CategoryEnvelopeRow.tsx`) →
**about 6 per category**; with 8 default categories, **≈48**.

Most of those figures share the same 13–15 px muted style; the only big type is the hero number.

**Why it burdens the user.** The daily question ("can I spend this?") needs 2–3 of them. The
rest are for planning or diagnosing. The Insights block is collapsed by default — good — but
the money view and the envelope footers are not.

**Principles.** Show what is frequently needed, defer the rest (R2); dashboards are for
at-a-glance reading (R7); minimise extraneous load (R6).

**Proposed change.** Envelope rows to two lines (name · left; paced meter); projection only when
a category is at risk; *Your money now* collapsed to one line with a breakdown on tap; captions
under the hero merged into one "how this plan is built" line. File 05 §Budget.

---

### F-05 · High · Reports is one long scroll of ten sections

**Evidence (Verified, `MonthlyReport.tsx:61-190`).** Net worth & savings rate → Typical month
(+ starting point table) → Estimate vs actual → month stepper → Income/Expenses → Expense
performance → Unexpected expenses → Why you spent → donut + category rows → Debt → Spending vs
previous month → weekly link.

**Why it burdens the user.** It mixes three questions — *how did this month go?*, *what does a
month cost me over time?*, *how is my wealth moving?* — with no grouping. The donut, the Why bar
and the Typical bar are three different proportional charts of the same spending.

**Principle.** Limit a visualisation to a central theme with two or three concepts (R5); avoid
more than two disclosure levels (R2).

**Proposed change.** Three labelled groups, month-scoped first. File 05 §Reports.

---

### F-06 · High · Reports' first three cards ignore the month stepper below them

**Evidence (Verified).** `NetWorthCard`, `TypicalMonthCard` and `EstimateVsActualCard` render
**above** `NavArrows` (`MonthlyReport.tsx:62-79`). The hook comment says the typical month "is not
tied to the month being browsed". Stepping back to March changes everything below the arrows
and nothing above them.

**Why it burdens the user.** Spatial convention: a control scopes what is beneath it. Here it
also sits beneath unscoped content, so the user cannot tell which figures belong to March.

**Proposed change.** The stepper becomes the first element and scopes the first group; multi-month
content moves under its own heading ("Over time — your last complete months") below it.

---

### F-07 · Medium · Repeated information

**Evidence (Verified).**

- *Left to spend* and *Budget left* — same number, same screen (F-01).
- Reports' **Unexpected expenses** card (`UnplannedCard`, `MonthlyReport.tsx:126`) and the
  **Unexpected** row of *Why you spent* (`:129`) report the same total; the memory notes already
  flag this as a possible merge.
- Reports' *Expense Performance* (planned / actual / remaining) repeats the Budget hero for the
  month; acceptable for past months, redundant for the current one.
- Dashboard *In / Out* and Reports *INCOME / EXPENSES* — fine across screens, but Dashboard *Net*
  adds a seventh "remaining-like" number to the hero card.

**Proposed change.** Merge Unexpected into the Why card (keep the last-month comparison line);
remove *Budget left* from the money view; move *Net* off the Home hero (it stays in Reports).

---

### F-20 · Medium · Home stacks separate "something needs you" cards

**Evidence (Verified, `DashboardScreen.tsx:95-136`).** Month overview → Quick log → Journey card →
Planned-due card → Wallets → Today's spending. Debts and tontines due are not on Home at all
(they appear as drawer dots), while planned purchases have their own card.

**Why.** Each attention source gets its own card, so importance is set by code order, not by
urgency. **Proposed change:** one "Next for you" slot that shows the single most urgent item
(overdue > due today > journey step action), with "+2 more". File 05 §Home.

---

## B. Visual presentation and data visualisation

### F-08 · High · Green means both "good" and "the spending you should reduce"

**Evidence (Verified).**

- `SUCCESS` green = on track (`budgetHealthDisplay`), money kept, "−25%" good change (`ChangeChip`).
- `SUCCESS` green = **Variable** spending in the typical-month bar (`TypicalMonthCard.tsx:74`).
- `SUCCESS` green = **Everyday — "the habits you can change"** in *Why you spent*
  (`WhyBreakdown.tsx:38`).
- Reports' performance bar: fill `TEXT_PRIMARY`, **track `SUCCESS`** (`MonthlyReport.tsx:116`) —
  the unspent part is green, the spent part black, inverse of every other bar in the app.
- The Expense log tile is tinted `DANGER_LIGHT`/`DANGER_TEXT` (`QuickActionBar.tsx:97-98`): the
  core habit the app wants is painted as danger.
- The brand accent `PRIMARY_GREEN` is also the link and button colour.

**Why it burdens the user.** Colour is read pre-attentively (R7). When the same hue says "good"
and "cut this", the eye learns nothing reliable. Red on the most frequent action frames logging
as bad news. **Hypothesis:** that frame feeds the avoidance behaviour known as the ostrich
effect (R9) — people check finances less when they expect bad news.

**Principle.** Don't reuse colours for different variables (R5); colour should carry category or
status, consistently (R7).

**Proposed change.** A semantic palette: status colours (on track / watch / over) reserved for
status; spending *kinds* (fixed, variable, event, unexpected) in a neutral, non-judging set
with text labels; neutral (brand) tint for the Expense tile. File 05 §Visual system.

---

### F-09 · High · Brand green text fails WCAG AA contrast

**Evidence (Verified by computation).** `PRIMARY_GREEN #10b981` on `SURFACE #FFFFFF` ≈ **2.5:1**
(relative luminance ≈ 0.36). On `PRIMARY_LIGHT #E8F5E9` it is lower still. WCAG 1.4.3 requires
4.5:1 for body text, 3:1 for large text (R11). It is used as a **text** colour in 35 places
(`grep "color: c.PRIMARY_GREEN"`), including *Assign*, *Edit plan*, *Show/Hide*, the category
placeholder, *Set up your wallets →*, *View Weekly Report →*. The dark palette keeps the same
value (`src/theme/palettes.ts:39`) where it passes on `#1e293b`; the problem is the light theme.

The colour file already knows this pattern: it defines `*_TEXT` companions for danger, warning
and success "because the base colours don't reach 4.5:1" (`src/constants/colors.ts`) — but not for
the primary green.

**Proposed change.** Add a `PRIMARY_TEXT` token (a darker emerald that reaches ≥4.5:1 on white and
on `PRIMARY_LIGHT`) and use it wherever green is text. Keep `PRIMARY_GREEN` for fills.

---

### F-10 · Medium · A category's colour changes from month to month

**Evidence (Verified).** `colorForIndex` assigns colours by the category's **rank** in that
month's breakdown (`src/features/finance/reports/categoryColors.ts`). If Transport is #1 in
March and #3 in April, it is mint in March and amber in April. The first palette entry (mint)
also resembles the status green.

**Proposed change.** Stable colour per category (by id or a stored colour), applied everywhere a
category is coloured. Data dependency: none if derived from id; a column if user-chosen.

---

### F-16 · Medium · Charts have no text alternative and one uses angle

**Evidence (Verified).** No `accessibilityLabel` on the donut, burn-down, sparkline, typical-month
bar or Why bar (grep count 0 in each file). `ProgressBar` sets `accessibilityRole="progressbar"`
and a value but no label (`src/components/ProgressBar.tsx:76-120`) — TalkBack announces
"progress bar, 60%" with no subject. The donut encodes shares as **angles/areas**, which people
compare poorly (R7); the rows beneath carry the real numbers, which mitigates it.

**Proposed change.** Each chart gets a one-sentence accessible summary (and a visible one where
the conclusion matters, R5 "state the intended message as text"); progress bars get labels;
replace the donut with a single ranked horizontal bar list (length encodes quantity best, R7) —
or keep it as decoration and hide it from screen readers. Decision in Phase 2.

---

### F-11 · Medium · Wallets on Home show balances with no total and no freshness

**Evidence (Verified, `src/features/finance/dashboard/WalletsCard.tsx`).** One row per wallet with
its computed balance; no total; no sign of when the balance was last confirmed (balance checks
exist since VS-42); no flag for "N expenses not linked to a wallet", which makes balances wrong
(shown only on Accounts).

**Why.** A computed balance that has drifted is the main way a finance app loses trust (R10).
**Proposed change.** A total line, and a quiet "checked 12 days ago" / "check balances" nudge
when the latest check is old or unlinked spending exists.

---

### F-21 · Low · On My path, "done" and "current" look the same

**Evidence (Verified).** `TONE` maps both `done` and `current` to `success`
(`JourneyScreen.tsx:23-28`); the current step is distinguished only by a 1 px green border.
**Proposed change:** "You are here" as a distinct accent; done as a quiet check.

---

### F-22 · Low–Medium · Motion and text-size robustness

**Evidence.** `AnimatedCounter` animates every figure change and ignores the OS *reduce motion*
setting (Verified — no `isReduceMotionEnabled` in `src/`). Labels use 11 px uppercase
(`Typography.tsx` `label`) and fixed widths such as `weekLabel: { width: 26 }`
(`BudgetInsights.tsx`) — likely to clip at large font scales (Inferred, not tested on device).

---

### F-23 · Low · Loading, empty and error states differ by screen

**Evidence (Verified).** Dashboard: a red error card with *Retry*. Reports: the error as plain
muted text (`MonthlyReport.tsx`), no retry. `NetWorthCard` and `JourneyCard` render **nothing**
on error or while loading — a silent gap. Budget: a skeleton (good). **Proposed change:** one
shared pattern per state (skeleton / empty with action / error with retry).

---

## C. Content and financial language

### F-14 · Medium · Overloaded and inconsistent words

**Evidence (Verified, `src/i18n/locales/en/*.ts` and `fr`).**

| Word | Meanings in the app today |
|---|---|
| **Planned / Prévu** | Reports' *Planned* = the month's budget; *Planned purchases* = shopping lists; *Plan* = a journey step; internally *unplanned* = imprévu |
| **Unassigned / Non réparti** | Budget not yet given to a category; *Leave unassigned* for surplus income; (code key `unassigned` on Accounts for expenses with no wallet — the visible text there says "not linked", fine) |
| **Net** | Dashboard *Net* = month in − out; Reports *Net worth* |
| **Committed / Engagé** | Bills, planned purchases, debts and tontines due — a finance term a non-expert may not parse |
| **Unexpected / Imprévu** | UI says *Unexpected* in English; project docs and memory say *imprévu*; fine, but the toggle hint "Spending you didn't see coming" is clearer than the label |
| **Description / Note** | The expense form labels the field *Description*, its placeholder says *Note (optional)*, its accessible name is *Note* |

Case is inconsistent: *Today's Spending*, *Expense Performance*, *Spending by Category*,
*View Weekly Report →*, *Log Expense* (Title Case) beside sentence case elsewhere.

**Proposed change.** A short UI vocabulary appended to `GLOSSARY.md` (one term → one visible
label in en and fr), sentence case everywhere. Reports' *Planned* → *Budget*.

---

### F-15 · Medium · Projections are not always marked as projections

**Evidence (Verified).** On category detail, the top comparison says *"on this pace, vs your
usual month"*, but each subcategory's change chip compares `part.amount * scale` (the
projection) while the row shows the **actual** amount, with no label
(`src/features/finance/budget/CategoryDetailSections.tsx:90-95`). A row can show 8,000 FCFA beside
"+40%" when 8,000 is below the usual month. The Budget hero's *On this pace* stat has the same
weight as *Days left*, a fact.

**Strength to keep.** *Provisional / Reliable* pills, *Estimate vs actual*, "Planned on expected
income · X of Y received", `ends ~` with a tilde.

**Principle.** Never make an uncertain figure look more precise than the data supports;
point estimates without context invite "incredible certitude" (R8).

**Proposed change.** A consistent visual marker for projected/estimated figures (e.g. "≈" prefix
plus muted style, and the word *heading for* in copy); chips state their basis.

---

## D. User journeys and interaction design

### F-13 · High · Onboarding is a tutorial deck that teaches the wrong first step and collects nothing

**Evidence (Verified).** Four swipe panels (`OnboardingScreen.tsx`, `onboarding.ts`): track, *budget
by category*, reports, done. No question is asked. The baseline checklist (balances, bills, debts,
fixed categories, estimates) lives on the My path tab (`JourneyScreen.tsx:103`), one tab away,
after onboarding has ended.

**Why.** NN/g's study of deck-of-cards tutorials found **no improvement** in task success or time,
and readers rated tasks **harder** (R4). The panels never mention the path that now organises
the product. Wallet balances, the one thing whose absence makes balances wrong from day one, are
never asked for.

**Proposed change.** Replace the deck with a short *set-up* that asks only what the Observe step
needs (wallets and what they hold, reminder time) and introduces the path; everything else is
asked in context when its feature first matters. File 04 §8.

---

### F-18 · Medium · Seven controls on every expense; the over-budget check interrupts

**Evidence (Verified, `ExpenseEntryPanel.tsx`).** Amount, category, *Unexpected* toggle, *Event*
picker, *Description*, date, wallet, Save — all visible. With a budget, saving may raise a modal
(category first, then month) that must be dismissed with *Proceed anyway*.

**Trade-off.** *Unexpected* and *Event* feed the Why model (VS-60–62); hiding them may reduce
data quality. The wallet feeds balances (F-11). **Hypothesis to test:** amount + category +
wallet + Save covers most entries; *Unexpected* is used often enough to stay visible; *Event*
and *Note* are rare.

**Proposed change.** Keep amount, category, wallet, *Unexpected*, and the date as a compact
"Today ▾" chip; fold *Event* and *Note* into "More details" (auto-expanded when editing an entry
that has them). Replace the blocking modal with an inline warning above Save on the second tap
— *only after* a timed comparison (file 06 §13).

---

### F-12 · Medium · The drawer mixes money objects with app administration and keeps dead rows

**Evidence (Verified, `AppDrawerContent.tsx:45-71`).** "Management" holds Accounts, Debts, Goals,
Tontines, Planned purchases, Events (money) **and** Categories, Export & Import, Backup & Restore
(admin). *Delete & Reset* and *Help* are disabled "Soon" rows (`:58`, `:64`) — flagged as M5 in
the September audit and still present.

**Proposed change.** Two groups — *My money* (Wallets, Goals, Debts, Tontines, Planned purchases,
Events) and *App* (Categories, Preferences, Backup, Export, Feedback) — and remove "Soon" rows
until those screens exist.

---

### F-17 · Low–Medium · Transactions has no search and mixes income into the day header

**Evidence (Verified, `TransactionList.tsx`).** Category chips and an *Unexpected* filter; no text
search. The day header shows a net (`income − spend`, `buildSections`), so a payday shows
"+150,000" and hides what was spent that day.

**Proposed change.** Search by note/amount; day header shows spending only, with income as a
separate "+" figure.

---

### F-19 · Low · Developer-facing doc comments describe removed features

**Evidence (Verified).** `DashboardScreen.tsx:30` says it shows "fund balances, top active
project"; the sheet comment says an income log "continues to the allocation flow". Neither exists.
**Why it matters here:** the next person implementing this plan reads these first. Fix with the
Phase 2 Home work, not separately.

---

### F-24 · Low · Journey card and Today card add little at a glance

**Evidence (Verified).** `JourneyCard` shows step number, title, the step's *goal sentence* (the
same sentence for weeks) and five segments. `TodaySpendingCard` shows today's total, a pace
caption computed differently from the Budget's (F-01) and a 7-day sparkline whose only label is
the peak. **Proposed change:** the journey card shows *progress* (e.g. "18 of 24 days logged
this month") instead of the static goal; today's spend joins the hero as one line; the
sparkline moves to Transactions or goes (decision in Phase 2).

---

## Strengths observed (keep them)

- One glossary, one health rule shared by Dashboard and Budget (`budget.progress.budgetHealth`).
- No budget → em-dash and a prompt instead of a false "0 FCFA · On track" (`MonthOverviewCard`).
- Status as a word in a chip, not colour alone (`BudgetHeroCard`, earlier audit L5).
- Pace markers on bars — they answer "ahead or behind?", not just "how much is gone?".
- Insights collapsed by default; empty charts suppressed.
- Category detail organised around questions; subcategory drill-down one level deep.
- Provisional labels, estimate vs actual, "give it a job" surplus that never raises the budget.
- Recording tools never gated; skip allowed on the path; steps never re-lock.
- Complete en/fr catalogues with type-checked parity.
