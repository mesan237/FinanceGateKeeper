# Finance Gatekeeper — Stitch Design Package

> Generated design brief + Stitch-ready prompts, derived from `docs/PRODUCT DOCUMENT.md`,
> `docs/KANBAN.md`, `docs/ARCHITECTURE.md`, and the live design tokens in
> `src/constants/colors.ts` + `src/components/Typography.tsx`.
> Currency is **FCFA only**. Mobile-first (React Native / Expo). Single-user app.

---

## 0. Product understanding (the lens for every screen)

**Vision.** Finance Gatekeeper is not a tracker — it is a *gatekeeper*. Money is allocated to a
job before it can be spent. The emotional design target is **calm control**, not anxiety:
discipline through friction, not blocking.

**Primary user.** A salaried professional in Central/West Africa with mixed/irregular income
(salary + freelance + e-commerce), heavy cash use, frequent informal lending, unpredictable
emergencies. Single user. Knows their numbers; wants speed and honesty, not hand-holding.

**Two modes shape the whole UI:**
- **Learning Mode (Month 1):** observation only. Logging is visible; budgeting, allocation,
  funds, projects, and budget-pace are hidden. The UI must feel intentionally minimal, not broken.
- **Control Mode (Month 2+):** the full gatekeeper activates — allocation, budgets, alerts, funds,
  projects, trends.

**Core journey:** *Set PIN → (Learning) log expenses daily → end of month switch to Control →
set allocation % + priorities → log income → allocate → spend against budget with friction alerts →
fund emergency/savings/projects → track informal debt → review weekly/monthly reports.*

---

## 1. Screen inventory

| # | Screen | Slice | Type | Priority |
|---|--------|-------|------|----------|
| 1 | PIN Auth (setup + entry) | VS-02 | Full screen | P0 |
| 2 | First-Run Onboarding *(suggested)* | — | Flow | P0 |
| 3 | Dashboard (Learning + Control variants) | VS-13 | Tab | P0 |
| 4 | Transactions list + filters | VS-03 | Tab | P0 |
| 5 | Expense Log | VS-03 | Push screen | P0 |
| 6 | Category Picker | VS-03 | Sheet/modal | P0 |
| 7 | Income Log | VS-05 | Push screen | P0 |
| 8 | Allocation Screen (post-income) | VS-06 | Push screen | P0 |
| 9 | Budget Overview | VS-06 | Tab | P0 |
| 10 | Allocation Settings | VS-06 | Push screen | P1 |
| 11 | Quick-Add grid | VS-07 | Push screen | P1 |
| 12 | Recurring Expenses | VS-07 | Push screen | P1 |
| 13 | Category Manager | VS-04 | Push screen | P1 |
| 14 | Zero-Day Prompt | VS-08 | Modal | P1 |
| 15 | Over-Budget Alert | VS-12 | Modal | P1 |
| 16 | Funds Overview | VS-09 | Push screen | P1 |
| 17 | Fund Detail | VS-09 | Push screen | P1 |
| 18 | Projects List | VS-10 | Tab | P1 |
| 19 | Project Create/Edit Form | VS-10 | Push screen | P1 |
| 20 | Project Detail + Timeline | VS-10 | Push screen | P1 |
| 21 | Timeline Recalc Alert | VS-10 | Modal | P2 |
| 22 | People Ledger (Debt List) | VS-11 | Push screen | P1 |
| 23 | Debt Form | VS-11 | Push screen | P2 |
| 24 | Debt Detail | VS-11 | Push screen | P2 |
| 25 | Reports Hub | VS-14 | Tab | P2 |
| 26 | Weekly Report | VS-14 | Push screen | P2 |
| 27 | Monthly Report + MoM Comparison | VS-14 | Push screen | P2 |
| 28 | Settings | VS-08/15 | Push screen | P1 |
| 29 | Backup & Recovery | VS-15 | Push screen | P2 |
| 30 | Mode-Switch Prompt *(suggested)* | VS-08 | Modal | P1 |
| 31 | Notification Center *(suggested)* | — | Push screen | P3 |
| 32 | Global Empty/First-Use states | all | Pattern | P0 |

---

## 2. User-flow map

```
APP LAUNCH
  └─► PIN Gate (1)
        ├─ first launch ─► Create PIN ─► First-Run Onboarding (2) ─► Dashboard (3)
        └─ returning    ─► Enter PIN ──────────────────────────────► Dashboard (3)

DASHBOARD (3)  ── bottom tabs ──► Transactions(4) · Budget(9) · Projects(18) · Reports(25)
   │ QuickActionBar
   ├─► Log Expense ─► Expense Log (5) ─► Category Picker (6)
   │        └─ on save (Control) ─► Over-Budget Alert (15)? ─► back to source
   ├─► Log Income  ─► Income Log (7) ─► Allocation Screen (8) ─► Dashboard
   └─► Confirm Zero Day ─► Zero-Day Prompt (14)

BUDGET TAB (9)
   ├─► Allocation Settings (10)  [% + drag priority, lock for month]
   └─► Funds Overview (16) ─► Fund Detail (17)

PROJECTS TAB (18)
   ├─► Create (19)
   └─► Project Detail (20) ─► Timeline Recalc Alert (21) [redistribute / accept / reprioritize]

TRANSACTIONS (4)
   ├─► Quick-Add (11)   ├─► Recurring (12)   ├─► Categories (13)   └─► Settings (28)

DEBT (People Ledger) (22) ─► Debt Form (23) · Debt Detail (24)

REPORTS HUB (25) ─► Weekly (26) · Monthly + MoM (27)

SETTINGS (28) ─► PIN change · Allocation % · Notifications/Reminder time · Categories ·
                 Mode toggle · Backup & Recovery (29)

CROSS-CUTTING: Mode-Switch Prompt (30) fires at end of Month 1.
               Notifications deep-link into 5, 14, 15, 20/21, 24.
```

---

## 3. Prioritized design order

1. **Design System foundation** (tokens, components) — do this in Stitch first; every screen reuses it.
2. **P0 spine (tracer):** PIN (1) → Onboarding (2) → Dashboard Learning (3) → Expense Log (5) +
   Category Picker (6) → Transactions (4). This is a usable Learning-Mode app.
3. **P0 Control core:** Income Log (7) → Allocation (8) → Budget Overview (9) → Dashboard Control (3).
4. **P1 habits + funds:** Quick-Add (11), Recurring (12), Zero-Day (14), Over-Budget (15),
   Category Manager (13), Allocation Settings (10), Funds Overview/Detail (16/17), Settings (28),
   Mode-Switch (30).
5. **P1/P2 long-horizon:** Projects (18/19/20/21), People Ledger (22/23/24).
6. **P2 insights + cloud:** Reports (25/26/27), Backup & Recovery (29).

---

## 4. Design system (shared by all prompts)

Paste this block into Stitch once (or use it to seed a Stitch Design System), then reference it.

```
PRODUCT: Finance Gatekeeper — a personal-finance "gatekeeper" mobile app (iOS + Android),
React Native look-and-feel. Single user, FCFA currency only. Tone: calm, disciplined, trustworthy,
modern fintech — NOT playful, NOT anxiety-inducing.

COLOR TOKENS (exact hex — do not invent others):
- Primary green  #2E7D32   (primary actions, positive/on-track, brand)
- Primary light  #E8F5E9   (tints, selected chips, success backgrounds)
- Background     #F5F7FA   (app canvas)
- Surface        #FFFFFF   (cards, sheets, inputs)
- Border         #E5E7EB   (hairlines, dividers, dashed empty-state borders)
- Text primary   #1A1A1A   (amounts, headings)
- Text secondary #374151   (body)
- Text muted     #6B7280   (captions, labels, dates)
- Danger         #D32F2F / light #FFEBEE  (over-budget, overdue, destructive)
- Warning        #F9A825 / light #FFFDE7  (approaching limit, caution)
- Success        #388E3C / light #E8F5E9  (target met, settled, on-track)

TYPOGRAPHY (system sans, e.g. Inter/SF):
- display     28 / 700 / -0.5 tracking   (hero amounts)
- heading     22 / 700                    (screen titles)
- subheading  16 / 600                    (card titles)
- body        15 / 400                    (content)
- muted       13 / 400, color muted       (captions/dates)
- label       11 / 600 / +0.6 tracking / UPPERCASE, color muted (eyebrow labels above values)

COMPONENTS:
- Button (primary): bg primary green, radius 8, padding 12×16, white 16/600 label, full-width on forms.
  Pressed = 80% opacity. Disabled = 50% opacity. Secondary = outline (green border, green text).
  Compact = 10×8 padding, 13px label, for dense rows.
- Card: surface white, radius 12, padding 16, subtle shadow (y2 blur8 ~6% black), 12px gap between cards.
- Empty-state card: transparent bg, 1px DASHED border #E5E7EB, no shadow.
- TextInput: surface, 1px border, radius 8, 12px vertical padding; numeric keypad for amounts.
- ProgressBar: 8px track radius-full, fill primary green (or warning/danger/success per state).
- Badge / status chip: pill, tinted bg + matching text color (e.g. Danger light bg + Danger text).
- Bottom tab bar: 5 tabs — Dashboard, Transactions, Budget, Projects, Reports. Active = primary green
  icon+label, inactive = muted. Surface bg, top hairline border.
- Modals: centered card on dimmed scrim; bottom-sheets for pickers.

LAYOUT: 16px screen padding, 12px gap rhythm, mobile 1-column. Sticky primary action bars sit OUTSIDE
the scroll area with a top hairline border. Generous tap targets (≥44px). FCFA amounts formatted with
thousands separators + " FCFA" suffix, right-aligned in rows.

ACCESSIBILITY (apply everywhere): WCAG AA contrast; never encode meaning by color alone — pair the
green/yellow/red pace with a text label and/or icon; all controls have accessible labels and ≥44px
targets; dynamic-type friendly; numeric keypad for money fields.
```

---

# 5. Stitch-ready prompts

Each prompt below is self-contained. Prepend the **Design system** block (section 4) when generating,
or rely on a saved Stitch Design System named "Finance Gatekeeper".

---

## Screen 1 — PIN Authentication

### Screen Overview
**Purpose:** Gate all data behind a numeric PIN; handle both first-time creation and returning entry.
**Users:** The single owner, on every cold launch / return from background.
**Key actions:** Create PIN (enter + confirm), enter PIN to unlock, recover via cloud (link).

### UX Requirements
- Two states in one screen: **Setup** (enter PIN, then confirm PIN) and **Unlock** (enter PIN).
- Custom numeric keypad (0–9, delete). No OS keyboard. Masked dots showing progress (4–6 digits).
- Shake + haptic + inline error on mismatch/wrong PIN; do not navigate away.
- Brand lockup at top (app name + small shield/lock motif). Minimal, focused, single column.
- Optional "Forgot PIN? Restore from cloud" link → Backup & Recovery.

### UI Components
Brand header, 4–6 dot PIN indicator, numeric keypad grid (3×4), error text slot, secondary text link.

### States
- **Loading:** brief splash/centered spinner while checking if a PIN exists.
- **Empty/Setup:** "Create your PIN" → "Confirm your PIN" two-step with progress hint.
- **Error:** "PINs don't match, try again" (setup) / "Incorrect PIN" (unlock), red text + shake.
- **Success:** dots fill green, quick check animation, route to Dashboard.

### Stitch Prompt
```
Design a mobile PIN lock screen for "Finance Gatekeeper", a calm, trustworthy personal-finance app.
Single column on a #F5F7FA canvas. Top: small shield/lock glyph in primary green #2E7D32 and the app
name in 22/700. Center: a title ("Enter your PIN" for returning users), a row of 4 hollow dots that
fill solid #2E7D32 as digits are entered, and a thin red error line slot (#D32F2F) below for "Incorrect
PIN". Bottom half: a custom 3×4 numeric keypad (1–9, blank, 0, backspace) with large circular tap
targets, white #FFFFFF keys with subtle borders #E5E7EB, primary-green pressed state. A muted text link
"Forgot PIN? Restore from cloud" at the very bottom.
Produce TWO frames: (1) Unlock state as described; (2) Setup state titled "Create your PIN" with a
sub-caption "Choose a 4-digit PIN to protect your finances" and a small step indicator "Step 1 of 2".
Modern fintech, generous spacing, accessible 44px+ keys, no decorative clutter.
```

---

## Screen 2 — First-Run Onboarding *(suggested — not explicit in PRD, required for a complete UX)*

### Screen Overview
**Purpose:** Explain the gatekeeper philosophy and the Learning→Control journey, then drop the user
into Learning Mode with zero configuration burden.
**Users:** Owner, once, right after PIN creation.
**Key actions:** Swipe through 3 intro cards; "Start in Learning Mode" CTA.

### UX Requirements
- 3 lightweight slides: (1) "Every franc gets a job" (allocation idea), (2) "Month 1 is just watching"
  (Learning Mode), (3) "Log honestly, every day" (daily habit + reminder permission).
- Slide 3 requests **notification permission** with a plain-language reason.
- Skippable; progress dots; never block the user behind long forms.

### States
- **Loading:** n/a (static). **Empty:** n/a. **Error:** permission denied → non-blocking toast, continue.
- **Success:** lands on Learning-Mode Dashboard with a subtle "You're in Learning Mode" banner.

### Stitch Prompt
```
Design a 3-slide mobile onboarding carousel for "Finance Gatekeeper" (calm fintech, FCFA currency).
Each slide: a simple flat illustration in primary green #2E7D32 / #E8F5E9 tints on #F5F7FA, a 22/700
headline, and a 15/400 muted body line. Slide 1 "Every franc gets a job" — illustration of money
splitting into labeled buckets (Emergency, Savings, Projects, Spending). Slide 2 "Month one, just
watch" — calendar/observation motif, copy about logging honestly with no budgets yet. Slide 3 "Stay on
top, daily" — bell/notification motif, copy asking to enable end-of-day reminders. Bottom: 3 progress
dots (active = green), a "Skip" text link top-right, and a full-width primary green button labeled
"Start in Learning Mode" on the final slide. Clean, friendly, uncluttered.
```

---

## Screen 3 — Dashboard (Learning + Control variants)

### Screen Overview
**Purpose:** At-a-glance financial state + fast access to logging. Home screen.
**Users:** Owner, multiple times/day.
**Key actions:** Read budget pace/funds/top project/today's spend; tap quick actions.

### UX Requirements
- Header: "Dashboard" + today's long date.
- **Control mode cards (in order):** Budget Summary (remaining this month + green/yellow/red pace
  indicator with TEXT label), Fund Status (emergency + savings mini progress bars), Top Project
  (name + % funded), Today's Spending (hero amount).
- **Learning mode:** show ONLY Today's Spending + a dashed "Getting started" card; hide budget/funds/
  project entirely.
- Sticky **QuickActionBar** outside scroll, top hairline: "Log Expense" (primary), "Log Income",
  "Confirm Zero Day".
- Pace indicator is the emotional anchor — color + label ("On track" / "Watch your pace" / "Over budget").

### UI Components
Card, ProgressBar, Badge (pace), hero amount (display), sticky action bar with 3 buttons.

### States
- **Loading:** centered green spinner + "Loading…".
- **Empty (no data):** Today's Spending shows "0 FCFA"; dashed "Getting started" card with guidance.
- **Error:** inline danger-light card with message + "Retry".
- **Success:** populated cards; pace chip reflects status.

### Stitch Prompt
```
Design a mobile Dashboard home screen for "Finance Gatekeeper" (calm fintech, FCFA). Canvas #F5F7FA,
16px padding, 12px gaps, white #FFFFFF cards radius 12 with soft shadow.
Header: "Dashboard" (22/700, #1A1A1A) with today's date below in muted 13 (#6B7280).
Card 1 "Budget Summary": small uppercase eyebrow label "REMAINING THIS MONTH", a large 28/700 amount
"162,000 FCFA", a full-width progress bar, and a status chip reading "On track" with primary-green
#2E7D32 tint. Show how the chip + bar also render as warning #F9A825 ("Watch your pace") and danger
#D32F2F ("Over budget").
Card 2 "Funds": two stacked mini rows — "Emergency Fund 320,000 / 500,000 (64%)" and "Savings 95,000 /
250,000 (38%)" — each with a thin green progress bar.
Card 3 "Top Project": eyebrow "TOP PROJECT", "E-commerce Launch" 16/600, "22% funded" muted.
Card 4 "Today's Spending": eyebrow + date on the left, hero amount "4,500 FCFA" (28/700) right-aligned.
Sticky bottom action bar (outside scroll, white with top hairline #E5E7EB): primary green button
"Log Expense", and two secondary outline buttons "Log Income" and "Confirm Zero Day".
Bottom tab bar with 5 tabs (Dashboard active green): Dashboard, Transactions, Budget, Projects, Reports.
Produce a SECOND frame for Learning Mode: same header + sticky bar, but ONLY the "Today's Spending"
card plus a dashed-border transparent "Getting started" card explaining budget tracking unlocks in
Control mode. Hide budget/funds/project cards.
```

---

## Screen 4 — Transactions (list + filters)

### Screen Overview
**Purpose:** Chronological ledger of expenses (and income markers) with filtering.
**Users:** Owner reviewing/auditing spending.
**Key actions:** Scroll history, filter by category + date range, tap a row, jump to Quick-Add/Recurring/Categories.

### UX Requirements
- Grouped by day with day subtotals; each row: category icon + name (subcategory as secondary),
  optional note, amount right-aligned, time/date.
- Income rows visually distinct (green amount, "+" / source tag); expenses neutral/dark amounts.
- Filter bar: category chips (horizontal scroll) + date-range control; active filters shown as removable chips.
- Entry points (header overflow or toolbar) to **Quick-Add**, **Recurring**, **Categories**, **Settings**.

### States
- **Loading:** skeleton rows. **Empty (no match):** illustration + "No transactions for these filters" +
  "Clear filters". **Empty (none ever):** "Log your first expense" CTA.
- **Error:** retry inline. **Success:** dense readable list.

### Stitch Prompt
```
Design a mobile "Transactions" screen for Finance Gatekeeper (FCFA, calm fintech). Canvas #F5F7FA.
Header "Transactions" (22/700) with a small overflow icon opening links to Quick-Add, Recurring,
Categories, Settings. Below header: a horizontally scrolling filter chip row (All, Food & Drink,
Transport, Housing, …) where the selected chip is primary-green-tinted #E8F5E9 with green text, plus a
"Date range" pill. Active filters appear as removable chips with an ×.
List grouped by day: each day has a muted header "Mon, 9 Jun • 4,500 FCFA" then white card-like rows.
Each expense row: a circular category icon (tinted), category name 15/600 with subcategory muted below,
optional note in muted, and the amount right-aligned in #1A1A1A. Income rows render the amount in
primary green #2E7D32 with a small "Salary" source tag. Comfortable 56px rows, hairline dividers.
Include an empty-filter state frame: centered light illustration, "No transactions match your filters",
and a secondary "Clear filters" button. Bottom tab bar (Transactions active).
```

---

## Screen 5 — Expense Log

### Screen Overview
**Purpose:** Manually log a single expense quickly and honestly.
**Users:** Owner, many times/day.
**Key actions:** Enter amount, pick category→subcategory, optional note, set date (defaults today), save.

### UX Requirements
- Amount field is the hero — large, numeric keypad, FCFA suffix, autofocus.
- Category picker opens a sheet (Screen 6). Selected category shown as a chip; subcategory optional.
- Date defaults to today with an easy date stepper.
- Primary "Save Expense" sticky at bottom. In Control mode, save runs the over-budget check → may
  trigger Over-Budget Alert (Screen 15) before persisting.

### UI Components
Large amount input, category chip/selector, subcategory selector, note textarea, date control, sticky Save.

### States
- **Loading:** save spinner on button. **Empty:** zeroed form, "0 FCFA" placeholder.
- **Error:** inline "Amount must be greater than 0", red field border; missing category blocks save.
- **Success:** brief confirmation → return to source (Dashboard/Transactions) with the new row visible.

### Stitch Prompt
```
Design a mobile "Log Expense" form screen for Finance Gatekeeper (FCFA, calm fintech). Canvas #F5F7FA.
Back chevron + title "Log Expense" (22/700). The hero is a large amount input centered near the top:
display-size 28–34/700 "0 FCFA" with a thin underline, implying a numeric keypad. Below, a section:
"Category" with a tappable selector row showing a placeholder "Choose a category" (chevron right); once
chosen it shows a tinted category chip (e.g. "Food & Drink") with an optional secondary "Subcategory"
selector beneath. Then an optional multi-line "Note" input (white, border #E5E7EB, radius 8). Then a
"Date" row defaulting to "Today, 9 Jun 2026" with left/right steppers. Sticky bottom: full-width primary
green "Save Expense" button. Show an error variant where the amount field border turns danger red
#D32F2F with helper text "Enter an amount greater than 0". Clean, fast, thumb-reachable.
```

---

## Screen 6 — Category Picker (bottom sheet)

### Screen Overview
**Purpose:** Choose a category, then optionally a subcategory, fast.
**Users:** Owner, during expense logging.
**Key actions:** Select category → reveal subcategories → select or skip → confirm.

### UX Requirements
- Bottom sheet over the form. Two-level: tap a category to expand its subcategories inline (accordion)
  or push to a subcategory list.
- Search field at top for long lists. Recently used categories pinned on top.
- "Manage categories" link → Category Manager. Default seed categories from the PRD table.

### States
- **Loading:** shimmer list. **Empty:** only defaults (always present). **Error:** retry.
- **Success:** selection closes sheet and returns chosen category+subcategory.

### Stitch Prompt
```
Design a mobile bottom-sheet "Category Picker" for Finance Gatekeeper. A rounded-top white sheet over a
dimmed scrim, drag handle at top, title "Choose a category". A search field below the title. A "Recent"
row of small tinted chips. Then a scrollable list of categories from this set: Housing, Transport,
Food & Drink, Communication, Shopping, Gifts & Help, Health, Bills, Other — each row has a circular
tinted icon, the name 15/600, and a chevron. Show one category expanded (accordion) revealing indented
subcategories as selectable rows with radio/check affordance (e.g. under Food & Drink: Raw food /
Ingredients, Eating out, Groceries, Drinks). Selected subcategory highlighted with #E8F5E9 + green
check. Sheet footer: a muted text link "Manage categories →". Accessible 44px rows.
```

---

## Screen 7 — Income Log

### Screen Overview
**Purpose:** Record income tagged by source; irregular income triggers immediate allocation.
**Users:** Owner, on payday / freelance payout / sale.
**Key actions:** Enter amount, choose source (Salary/Freelance/E-commerce), optional note + date, save → Allocation.

### UX Requirements
- Source picker is a prominent 3-option visual selector (segmented cards with icons).
- Save (in Control mode) routes to Allocation Screen; in Learning mode just records to history.
- Recent income list inline below the form for quick context.

### States
- **Loading:** save spinner. **Empty:** zeroed form, source unselected.
- **Error:** "Select a source" / "Enter an amount". **Success:** navigates to Allocation (Control) or
  shows it in the recent list (Learning).

### Stitch Prompt
```
Design a mobile "Log Income" screen for Finance Gatekeeper (FCFA, calm fintech). Canvas #F5F7FA, back
chevron + title "Log Income". Hero amount input "0 FCFA" (28–34/700) near top. Below, a "Source"
section with THREE selectable cards in a row (or stacked): "Salary" (briefcase icon), "Freelance"
(laptop icon), "E-commerce" (cart icon); the selected card has a primary-green border + #E8F5E9 tint +
green check. Optional "Note" input and a "Date" row defaulting to today. Sticky full-width primary green
button "Save & Allocate". Beneath the form (scrollable), a "Recent income" mini list: rows with source
tag chip, amount in green #2E7D32, and date. Show the unselected/error state where a red helper line
prompts "Choose an income source". Modern, confident, generous spacing.
```

---

## Screen 8 — Allocation Screen (post-income)

### Screen Overview
**Purpose:** Show exactly how the just-logged income splits across buckets in strict priority, and confirm.
**Users:** Owner, immediately after logging income (Control mode).
**Key actions:** Review per-bucket amounts (Emergency → Savings → Projects → Expenses), confirm, or edit %.

### UX Requirements
- Clear waterfall of the income amount into 4 buckets, each showing % and computed FCFA.
- Emergency Fund first; if target already met, show it as redistributed (struck/greyed with a note).
- Projects bucket expands to show the per-project split by priority.
- "Confirm Allocation" primary CTA; secondary "Adjust percentages" → Allocation Settings.
- Reassure: "Percentages are locked for this month."

### States
- **Loading:** compute spinner. **Empty:** n/a (always has an income amount).
- **Error:** if no allocation config exists → prompt to set it up first (CTA to Allocation Settings).
- **Success:** confirm persists deposits + returns to Dashboard with updated numbers.

### Stitch Prompt
```
Design a mobile "Allocate Income" confirmation screen for Finance Gatekeeper (FCFA). Canvas #F5F7FA.
Title "Allocate Income" (22/700). Top hero card: "Income to allocate" eyebrow label + "400,000 FCFA"
(28/700) with the source chip "Salary". Below, a vertical waterfall of FOUR bucket cards in priority
order, each a white card with an icon, name, percentage pill, and the computed amount right-aligned:
1) Emergency Fund — 10% — 40,000 FCFA (shield icon),
2) Savings — 10% — 40,000 FCFA (piggy-bank icon),
3) Projects — 15% — 60,000 FCFA (rocket icon) — expandable to show "E-commerce Launch 40,000" and
   "BRVM Investment 20,000" sub-rows by priority,
4) Spending Budget — 65% — 260,000 FCFA (wallet icon), visually emphasized as "what's left to spend".
Connect them with a subtle vertical line implying flow/priority. A small note: "Percentages are locked
for this month." Sticky bottom: full-width primary green "Confirm Allocation" + a secondary text link
"Adjust percentages". Include a variant where Emergency Fund shows a green "Target met — redistributed"
badge and its amount is greyed. Calm, precise, trustworthy.
```

---

## Screen 9 — Budget Overview (tab)

### Screen Overview
**Purpose:** Show the month's expense budget vs. actual spend, with category progress and entry to settings/funds.
**Users:** Owner, checking headroom before spending.
**Key actions:** Read overall remaining + per-category bars; open Allocation Settings; open Funds.

### UX Requirements
- Top summary: total expense budget, spent, remaining, with a prominent pace indicator (color + label).
- Per-category list with progress bars (spent/allocated); over-budget categories flagged danger.
- Buttons/links to Allocation Settings and Funds Overview.
- Learning mode: this tab is hidden/locked → show a "Switch to Control mode" prompt instead.

### States
- **Loading:** skeletons. **Empty (no allocation set):** dashed card "Set your allocation to start
  budgeting" + CTA. **Error:** retry. **Success:** populated bars; danger flags where over.

### Stitch Prompt
```
Design a mobile "Budget" tab for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Title "Budget" (22/700) +
month selector "June 2026". Top summary card: "Spending budget" with three figures — Budget 260,000 /
Spent 98,000 / Remaining 162,000 — a full-width progress bar, and a pace chip "On track" (green). Then
a section "By category": a list of category rows, each with icon + name, "12,000 / 30,000 FCFA" figure,
and a thin progress bar (green when under, warning #F9A825 near limit, danger #D32F2F when over with the
overflow shown). Show one category in the over-budget danger state. Footer buttons: secondary outline
"Allocation settings" and "View funds". Bottom tab bar (Budget active). Include an empty-state frame: a
dashed card "Set your monthly allocation to start budgeting" with a primary "Set allocation" button.
```

---

## Screen 10 — Allocation Settings

### Screen Overview
**Purpose:** Configure the 4 bucket percentages and the funding priority order; lock for the month.
**Users:** Owner, monthly (or first Control-mode setup).
**Key actions:** Set %s (must total 100), drag to reorder priority, confirm & lock.

### UX Requirements
- Four buckets with sliders + numeric inputs; a live "Total: 100%" indicator that turns danger if ≠100.
- Drag-to-reorder priority list (Emergency typically pinned first).
- Emergency Fund target field + note about auto-redistribution when met.
- "Confirm & lock for this month" primary; warn that locking prevents changes until next month.

### States
- **Loading:** n/a. **Empty (first time):** sensible defaults pre-filled.
- **Error:** total ≠ 100% disables confirm + shows the remainder ("You have 5% unallocated").
- **Success:** locked confirmation; returns to Budget.

### Stitch Prompt
```
Design a mobile "Allocation Settings" screen for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Title
"Allocation" (22/700) with subtitle "How each income splits this month". A live total banner near top:
"Total allocated: 100%" in green; show the danger variant "95% — 5% unallocated" in #FFEBEE/#D32F2F.
Four bucket rows, each: icon + name (Emergency Fund, Savings, Projects, Spending), a horizontal slider,
and an editable percentage input box on the right. Below, a "Priority order" section: a draggable list
with drag handles showing the funding order (Emergency → Savings → Projects → Spending), each as a
white pill row. An "Emergency fund target" input ("500,000 FCFA") with a muted note: "When the target is
met, its percentage redistributes proportionally to the other buckets." Sticky bottom: full-width
primary green "Confirm & lock for June" plus a muted note "Locked allocations can't change until next
month." Clean, controls-forward, fintech-precise.
```

---

## Screen 11 — Quick-Add grid

### Screen Overview
**Purpose:** One-tap logging of frequent fixed expenses.
**Users:** Owner, on the go.
**Key actions:** Tap a template to log instantly; long-press to edit; add new template.

### UX Requirements
- Grid of large template buttons: label + amount (e.g., "Taxi 500", "Lunch 1,500").
- Tap = instant log (with toast + undo, and over-budget check in Control mode). Long-press = edit sheet.
- Prominent "＋ New shortcut" tile. Template form: label, amount, category, subcategory.

### States
- **Loading:** skeleton tiles. **Empty:** friendly prompt "Create shortcuts for things you buy often" +
  add tile. **Error:** toast. **Success:** toast "Taxi 500 logged" + Undo.

### Stitch Prompt
```
Design a mobile "Quick-Add" screen for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Title "Quick-Add"
(22/700) + muted subtitle "Tap to log instantly". A 2-column grid of large rounded white tiles (radius
12, soft shadow), each tile showing a category icon, a bold label ("Taxi"), and the amount ("500 FCFA",
green #2E7D32). Include tiles: Taxi 500, Lunch 1,500, Moto 300, Phone credit 1,000, Coffee 700. A
final dashed-border "＋ New shortcut" tile. Show a success toast at the bottom "Taxi 500 FCFA logged"
with an "Undo" action in green. Include a secondary frame: the "Edit shortcut" bottom sheet (label
input, amount input, category + subcategory selectors, Save + Delete). Fast, tappable, 44px+ targets.
```

---

## Screen 12 — Recurring Expenses

### Screen Overview
**Purpose:** Manage scheduled auto-logged expenses (rent, data, electricity).
**Users:** Owner, occasionally.
**Key actions:** View next due dates, toggle active, edit amount/frequency, skip an occurrence.

### UX Requirements
- List of recurring items: name/category, amount, frequency, next due date, active toggle.
- Each item: edit (amount, frequency, category) and "Skip next" action.
- Clear note that active items auto-log on their due date when the app opens.

### States
- **Loading:** skeletons. **Empty:** "No recurring expenses yet" + "Add recurring expense".
- **Error:** retry. **Success:** updated next-due reflects edits/skips.

### Stitch Prompt
```
Design a mobile "Recurring Expenses" screen for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Title
"Recurring" (22/700) + muted note "These log automatically on their due date". A list of white cards,
each: category icon + name ("Rent", "Phone data", "Electricity"), amount right-aligned, a second line
"Monthly • Next: 1 Jul 2026" in muted, and an active/inactive toggle switch (green when on). A small
overflow per row revealing "Edit" and "Skip next occurrence". Floating/primary button "＋ Add recurring
expense". Include an empty-state frame with a dashed card and the same add button. Calm, organized.
```

---

## Screen 13 — Category Manager

### Screen Overview
**Purpose:** Full CRUD over categories and subcategories.
**Users:** Owner, when tailoring the taxonomy.
**Key actions:** Add/rename/delete category, add/rename/delete subcategory, reorder, reassign on delete.

### UX Requirements
- Accordion list: categories with nested subcategories; default vs custom distinguished (badge/lock).
- Add category / add subcategory inline; rename via tap; delete via swipe or long-press menu.
- Deleting a category with existing expenses triggers a **reassignment prompt** (move to another category).

### States
- **Loading:** skeleton. **Empty:** never (defaults exist). **Error:** "Can't delete — reassign first".
- **Success:** new category immediately available in pickers.

### Stitch Prompt
```
Design a mobile "Manage Categories" screen for Finance Gatekeeper. Canvas #F5F7FA. Title "Categories"
(22/700). An accordion list of category rows (icon, name 15/600, chevron, a small grey "Default" or
green "Custom" badge). Expand one to reveal indented subcategory rows with edit (pencil) and delete
(trash) affordances; a faint "＋ Add subcategory" row at the bottom of the group. Each category row
supports swipe-to-delete (reveal a red #D32F2F delete action) and drag handle for reorder. A primary
button "＋ Add category". Include a confirmation modal frame titled "Reassign before deleting": "Food &
Drink has 23 expenses. Move them to:" with a category dropdown and "Delete & reassign" (danger) /
"Cancel" buttons. Tidy, editable, clear default-vs-custom distinction.
```

---

## Screen 14 — Zero-Day Prompt (modal)

### Screen Overview
**Purpose:** End-of-day confirmation of a no-spend day to preserve logging integrity/streak.
**Users:** Owner, evening, if nothing logged.
**Key actions:** Confirm zero-spend day, or "Let me log" → Expense Log.

### Stitch Prompt
```
Design a centered modal card over a dimmed scrim for Finance Gatekeeper. Card: a friendly coin/zero
illustration in green tint, title "Did you spend nothing today?" (subheading 16/600), body "Confirm a
zero-spend day to keep your logging streak honest." Two stacked buttons: primary green "Confirm zero
day" and secondary outline "Let me log an expense". A muted dismiss "Not now" link. Calm, non-judgmental
tone. Include the success micro-state: a green check with "Zero day confirmed — nice discipline."
```

States — **Success:** records zero-day, dismiss. **Error:** toast + stay open.

---

## Screen 15 — Over-Budget Alert (modal)

### Screen Overview
**Purpose:** Create friction (not a block) when an expense would exceed the budget.
**Users:** Owner, at save time in Control mode.
**Key actions:** Proceed anyway (logs + flags for report) or Cancel (back to form).

### Stitch Prompt
```
Design a centered warning modal for Finance Gatekeeper (FCFA). Dimmed scrim, white card with a warning
triangle in danger #D32F2F atop a #FFEBEE tint header band. Title "Over budget" (16/600). Body in
#374151: "This puts you 3,200 FCFA over your Food & Drink budget for June." A small summary row:
"Budget 30,000 • Spent 35,200 → over by 3,200 FCFA". Two buttons: a DANGER-outline "Proceed anyway" and
a primary green "Cancel". Make clear the app does NOT block — proceeding is allowed but discouraged.
Include a stronger variant headline "You've exceeded your monthly spending budget" for the total-budget
case. Honest, firm, not punitive.
```

States — **Success (proceed):** saves + records overspend event. **Cancel:** returns to form unchanged.

---

## Screen 16 — Funds Overview

### Screen Overview
**Purpose:** Combined view of Emergency Fund and Savings progress.
**Users:** Owner, checking safety net + savings.
**Key actions:** Read both progress bars; tap a fund → Fund Detail.

### UX Requirements
- Two stacked fund cards: target, current, %, progress bar. Emergency shows "Target met" success state
  + a note that its allocation redistributed.
- Savings may have named sub-goals (optional) with their own targets/timelines.

### States
- **Loading:** skeleton bars. **Empty:** "Set a target to start your emergency fund" CTA.
- **Error:** retry. **Success:** populated; success badge if target met.

### Stitch Prompt
```
Design a mobile "Funds" screen for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Title "Funds" (22/700).
Two large white cards. Card A "Emergency Fund" (shield icon): "320,000 / 500,000 FCFA" with a 64%
progress bar in primary green, eyebrow "EMERGENCY FUND", and a tappable chevron. Card B "Savings"
(piggy-bank icon): "95,000 / 250,000 FCFA", 38% bar, plus an optional sub-list of named goals ("New
laptop — 60,000/150,000"). Show a variant of the Emergency card in the success state: full green bar,
a "Target met" badge (#E8F5E9/#388E3C), and a muted note "Allocation redistributed to other buckets."
Include an empty-state for Savings: dashed card "Add a savings goal". Calm, reassuring, progress-forward.
```

---

## Screen 17 — Fund Detail

### Screen Overview
**Purpose:** Deep view of one fund: progress, target editing, deposit/withdrawal history.
**Users:** Owner.
**Key actions:** Edit target, view history, (emergency) record a withdrawal.

### Stitch Prompt
```
Design a mobile "Fund Detail" screen for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Header with back
chevron + fund name "Emergency Fund". A hero progress block: large "320,000 FCFA" (28/700), muted "of
500,000 target — 64%", a thick green progress bar, and an "Edit target" text link. A row of two
secondary buttons: "Add funds" and "Withdraw" (withdraw in danger outline). Then a "History" section:
a timeline list of deposits (green "+40,000 FCFA — from June salary allocation") and withdrawals (danger
"−25,000 FCFA — emergency use"), each with date. Include the target-met variant with a success banner.
Clear, auditable, trustworthy.
```

States — **Loading** skeleton; **Empty** "No activity yet"; **Error** retry; **Success** full history.

---

## Screen 18 — Projects List (tab)

### Screen Overview
**Purpose:** Priority-ranked list of funding projects with progress + estimated completion.
**Users:** Owner, planning toward goals.
**Key actions:** View progress/timelines, drag-reorder priority, open detail, create new.

### UX Requirements
- Each project card: name, funded/target + %, progress bar, "Est. complete: March 2026", priority rank.
- Drag handles to reorder priority (which changes funding cascade). Status badges (active/paused/completed).

### States
- **Loading:** skeleton. **Empty:** "Create your first project" CTA. **Error:** retry.
- **Success:** ordered list; completed projects visually settled (green check).

### Stitch Prompt
```
Design a mobile "Projects" tab for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Title "Projects" (22/700)
+ muted "Funded by priority". A reorderable list of white project cards, each with a drag handle and a
priority number badge ("1", "2"): project name 16/600 ("E-commerce Launch"), "180,000 / 500,000 FCFA"
muted, a green progress bar (36%), and a small row "Est. complete: Mar 2026" with a calendar icon. Show
a "completed" card with a green check + "Funded" badge and a "paused" card greyed with a "Paused" chip.
Primary button "＋ New project". Bottom tab bar (Projects active). Include an empty-state frame: dashed
card "Set a goal and fund it over time" + "Create project" button. Motivating but calm.
```

---

## Screen 19 — Project Create/Edit Form

### Stitch Prompt
```
Design a mobile "New Project" form for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Back chevron + title
"New Project". Fields: "Project name" text input; "Target amount" numeric input with FCFA suffix
("500,000 FCFA"); optional "Deadline" date picker row (with a "No deadline" toggle); a muted helper
"New projects are added at the lowest priority — reorder them on the Projects screen." Sticky bottom:
full-width primary green "Create project". Show the edit variant titled "Edit Project" with a danger
text link "Delete project" at the bottom and a confirm modal. Minimal, focused.
```

States — **Error:** "Name required" / "Target must be > 0". **Success:** returns to Projects list.

---

## Screen 20 — Project Detail + Timeline

### Screen Overview
**Purpose:** Full project view — progress, funding history, timeline estimate, disruption options.
**Users:** Owner.
**Key actions:** Read timeline, contribute manually, adjust priority, respond to disruptions.

### Stitch Prompt
```
Design a mobile "Project Detail" screen for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Header back +
project name "E-commerce Launch" with a priority badge "#1". Hero: "180,000 FCFA" (28/700) + muted "of
500,000 target — 36%" + thick green progress bar. A timeline card: a small horizontal timeline graphic
with "Now" and "Est. complete: Mar 2026", and a line "At current rate (~60,000 FCFA/mo) → 6 months left."
Two buttons: primary "Add funds manually" + secondary "Change priority". A "Funding history" list
(green "+60,000 FCFA — June allocation", dated). Include a callout card variant in warning #FFFDE7:
"Timeline shifted — tap to see options" linking to the recalculation alert. Goal-oriented, clear.
```

States — **Loading** skeleton; **Empty history** "No funding yet"; **Error** retry; **Success** full.

---

## Screen 21 — Timeline Recalc Alert (modal)

### Stitch Prompt
```
Design a centered modal for Finance Gatekeeper. Header band in warning #FFFDE7 with a calendar/clock
icon (#F9A825). Title "Your timeline changed" (16/600). Body: "E-commerce Launch is now estimated for
April instead of March." Then three clearly separated option rows, each a tappable card with icon +
title + one-line description:
1) "Redistribute from savings" — pull funds to stay on schedule,
2) "Accept the delay" — keep current plan, move the date,
3) "Reprioritize projects" — fund this one first.
Bottom: a muted "Decide later" dismiss link. Calm, solution-oriented, gives the user agency.
```

States — **Success:** chosen option triggers its action + closes. **Dismiss:** keeps the warning callout on detail.

---

## Screen 22 — People Ledger (Debt List)

### Screen Overview
**Purpose:** Track money lent and owed informally, with due-date reminders.
**Users:** Owner.
**Key actions:** Switch Lent/Owed tabs, view balances + due dates, add entry, open detail, settle.

### UX Requirements
- Two tabs: **Lent** (money out, awaiting return) and **Owed** (money you owe). Each tab shows a total.
- Rows: person name, amount, due date with status badge (Pending / Due soon / Overdue / Settled).
- Reminder note: money owed to you isn't counted as income until received.

### States
- **Loading:** skeleton. **Empty (per tab):** "No one owes you yet" / "You don't owe anyone".
- **Error:** retry. **Success:** lists with overdue flagged danger, settled greyed.

### Stitch Prompt
```
Design a mobile "People Ledger" screen for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Title "People"
(22/700). A segmented tab control "Lent" / "Owed" with a total under it ("You're owed 45,000 FCFA").
A list of white rows: a circular avatar/initials, person name 15/600, amount right-aligned, and a
second line with due date + status badge — "Due 15 Jun" (neutral), "Due in 2 days" (warning #FFFDE7),
"Overdue 3 days" (danger #FFEBEE/#D32F2F), or "Settled" (green, greyed row). Primary button "＋ Add
entry". Include the empty-state frame for the Owed tab: light illustration + "You don't owe anyone
right now". Clear two-direction model, human and non-judgmental.
```

---

## Screen 23 — Debt Form

### Stitch Prompt
```
Design a mobile "Add Ledger Entry" form for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Title varies by
a top segmented toggle "Lent" / "Owed". Fields: "Person" text input (with contact-style avatar
placeholder), "Amount" numeric with FCFA suffix, optional "Due date" date row (with "No due date"
toggle), optional "Note" input. A muted helper under the Lent option: "Money owed to you isn't counted
as income until you receive it." Sticky bottom: primary green "Save entry". Simple, quick.
```

States — **Error:** "Person and amount required." **Success:** returns to the matching tab.

---

## Screen 24 — Debt Detail

### Stitch Prompt
```
Design a mobile "Ledger Detail" screen for Finance Gatekeeper (FCFA). Header back + person name "Jean".
A hero card: direction chip ("You lent"), amount "15,000 FCFA" (28/700), and due-date row with status
badge (e.g. "Overdue 2 days", danger). A note field if present. Primary button "Mark as settled"
(green); secondary "Edit due date". A small reminders note: "We'll remind you 3 days before and after
the due date." Show the settled variant: greyed amount, green "Settled on 16 Jun" badge, settle button
replaced by "Reopen". Clean, factual.
```

---

## Screen 25 — Reports Hub (tab)

### Stitch Prompt
```
Design a mobile "Reports" tab for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Title "Reports" (22/700).
Two large entry cards: "This Week" (a small sparkline/bar preview, "Spent 32,000 FCFA · on track") and
"This Month" (a small pie preview, "Income 400,000 · Spent 210,000"). Below, a "Trends" teaser card with
one optimization insight: a warning-tinted row "Food & Drink up 18% over 2 months — review eating out."
Tapping a card opens the full report. Bottom tab bar (Reports active). Calm, insightful, scannable.
```

---

## Screen 26 — Weekly Report

### Stitch Prompt
```
Design a mobile "Weekly Report" screen for Finance Gatekeeper (FCFA). Canvas #F5F7FA. Header back +
"Week of 3–9 Jun". Summary cards row: "Total spent 32,000 FCFA", "vs weekly avg −8% (green, good)",
and an "On track" pace chip. A bar chart of daily spending (Mon–Sun) in primary green with the
highest-spend day highlighted. A "Top categories" mini list with amounts and small bars. Keep charts
clean with muted axes, readable FCFA labels. Honest, encouraging.
```

States — **Empty:** "Not enough data this week yet." **Error:** retry. **Loading:** skeleton chart.

---

## Screen 27 — Monthly Report + Month-over-Month Comparison

### Stitch Prompt
```
Design a comprehensive mobile "Monthly Report" screen for Finance Gatekeeper (FCFA). Canvas #F5F7FA.
Header back + "June 2026". Stacked sections, each a card:
1) "Income vs Expenses": two-bar comparison (Income 400,000 green, Expenses 210,000) + net saved.
2) "Allocation performance": per-bucket planned-vs-actual mini bars (Emergency, Savings, Projects,
   Spending) with checkmarks where on target.
3) "Spending breakdown": a pie/donut chart of categories with a legend + percentages.
4) "Month over month": grouped bar chart per category (This month vs Last month) with up/down arrows
   and % deltas (red up, green down for spending).
5) "Funds & projects": progress bars for emergency, savings, top projects.
6) "People ledger": outstanding lent/owed totals.
7) "Suggestions": warning-tinted insight rows ("Transport increased 23% — consider alternatives").
Charts clean and muted; FCFA labels legible; generous section spacing. Deep but scannable.
```

States — **Empty:** "Your first monthly report unlocks at month end." **Loading:** skeletons. **Error:** retry.

---

## Screen 28 — Settings

### Screen Overview
**Purpose:** Central control: security, allocation, notifications, categories, mode, backup.
**Users:** Owner.
**Key actions:** Change PIN, edit allocation %, set reminder time, toggle notifications, manage
categories, switch mode, open backup.

### Stitch Prompt
```
Design a mobile "Settings" screen for Finance Gatekeeper (calm fintech). Canvas #F5F7FA. Title
"Settings" (22/700). Grouped list sections with muted uppercase section labels:
SECURITY — "Change PIN" (chevron), "Require PIN on open" (toggle, on).
APP MODE — a segmented "Learning / Control" control with a muted explainer; show a green "Recommended:
switch to Control" hint if month 1 is complete.
BUDGET — "Allocation percentages" (chevron), "Categories" (chevron).
REMINDERS — "Daily reminder" toggle (on) + a time row "9:00 PM" (chevron), "Notifications" toggle.
BACKUP — "Cloud backup" row with a status chip "Synced 2h ago" (green) + chevron, "Sync now" action.
ABOUT — version row. Rows are white with hairline dividers, icons on the left, chevrons/toggles right.
Clean iOS/Android-settings style, organized, trustworthy.
```

States — **Loading:** rows render with placeholder values. **Error:** sync chip shows danger "Sync failed".

---

## Screen 29 — Backup & Recovery

### Stitch Prompt
```
Design a mobile "Cloud Backup" screen for Finance Gatekeeper. Canvas #F5F7FA. Header back + "Cloud
Backup". A status hero card: a cloud icon, "Last synced 2 hours ago" (green), and a "Sync now" primary
button; show a danger variant "Last sync failed — tap to retry" and an offline variant "Offline —
changes will sync when you're back online" (muted). A "Account" section: signed-in email row + "Sign
out". A "Recovery" explainer card: "Lost your phone? Install the app, sign in here, and your data
restores automatically." Reassuring, local-first messaging ("Your data lives on this device; the cloud
is a safety net.").
```

States — **Loading (syncing):** progress bar + "Syncing… 60%". **Error:** danger card + retry. **Success:** green "All synced".

---

## Screen 30 — Mode-Switch Prompt (modal) *(suggested)*

### Stitch Prompt
```
Design a celebratory-but-calm modal for Finance Gatekeeper. White card, a green milestone icon. Title
"You've finished your first month!" (16/600). Body: "You logged X days and spent Y FCFA. Ready to turn
on the gatekeeper? Control mode lets you allocate income, set budgets, and fund your goals." A small
preview of what unlocks (3 mini rows: Allocation, Budgets, Projects). Buttons: primary green "Switch to
Control mode" + secondary "Stay in Learning mode for now". Motivating, never coercive.
```

---

## Screen 31 — Notification Center *(suggested, P3)*

### Stitch Prompt
```
Design a mobile "Notifications" list for Finance Gatekeeper. Canvas #F5F7FA. Title "Notifications".
A list of grouped rows by day, each with an icon by type: daily-log reminder, zero-day, over-budget
(danger), debt due (warning), project timeline (warning). Each row: title, one-line body, time, and an
unread dot (green). Tapping deep-links to the relevant screen. Include a "Mark all read" text action and
an empty state "You're all caught up." Tidy, low-noise.
```

---

## 6. UX recommendations before design begins

1. **Make the pace indicator the emotional core — and never color-only.** The green/yellow/red budget
   pace appears on Dashboard + Budget. Always pair it with a text label and icon (accessibility + clarity).
2. **Design Learning Mode as a deliberate, complete experience**, not a disabled Control Mode. It should
   feel calm and sufficient, with a single clear "what unlocks later" hint. (Handled via Dashboard + Budget
   empty/locked variants and the Mode-Switch prompt.)
3. **Friction, not blocking.** The Over-Budget Alert must make "Proceed anyway" possible but visually
   discouraged (danger-outline secondary), reinforcing the gatekeeper philosophy without nannying.
4. **Allocation is the product's "wow" moment.** Invest in Screen 8's waterfall: it's where the
   philosophy ("every franc gets a job") becomes tangible. Show the project sub-split and the
   target-met redistribution state.
5. **Speed of logging beats everything.** Expense Log + Quick-Add must be one-or-two-tap with autofocus
   numeric keypad and instant feedback (toast + undo). This drives the core success metric (30-day streak).
6. **Add the missing screens** the PRD implies but doesn't enumerate: First-Run Onboarding (2),
   Mode-Switch prompt (30), Backup & Recovery (29), and global Empty/First-Use states (32). They're
   required for a coherent first session and phone-loss recovery.
7. **Two-direction debt model needs visual clarity.** Keep Lent/Owed as distinct tabs with distinct
   totals; reinforce that "owed-to-you" is not income until received (helper text on form + detail).
8. **Charts: restraint over richness.** Use muted axes, generous spacing, and legible FCFA labels.
   Always design the empty/insufficient-data chart state — early months will be sparse.
9. **FCFA formatting is a system rule, not per-screen.** Thousands separators + " FCFA" suffix,
   right-aligned in rows, hero amounts in `display`. No decimals (FCFA has none in practice).
10. **Consistency contracts to lock before generating:** card radius 12 / padding 16 / gap 12; sticky
    primary action bars outside scroll with a top hairline; 16px screen padding; one primary action per
    screen; secondary actions as outline or text links.

---

## 7. Ambiguities / contradictions to resolve with the owner

- **PIN ↔ Supabase auth relationship.** VS-15 itself flags this ("tied to PIN or separate?"). The
  recovery flow (Screen 1 "Restore from cloud", Screen 29) assumes a cloud account distinct from the
  PIN. Confirm: is there an email/password (or magic-link) Supabase login behind the scenes, and does
  "Forgot PIN" authenticate via that?
- **Savings named goals depth.** PRD 5.7 allows optional named savings goals with targets/timelines, but
  the funds slice (VS-09) tracks a single savings figure. Screens 16/17 show optional sub-goals — confirm
  whether sub-goals ship now or later.
- **Income editing/deletion.** VS-05 explicitly ships *without* edit/delete. Transactions (Screen 4) and
  history therefore show income as read-only — confirm that's intended for v1 (affects row affordances).
- **Quick-Add over-budget check.** Tapping a Quick-Add tile in Control mode can trigger the Over-Budget
  Alert mid-flow — confirm the desired interruption (modal over the grid vs. proceed-then-flag).
- **Recurring auto-log timing.** Auto-log happens on app open when due (not a true background job).
  Surface this honestly in copy (Screen 12) so users don't expect logging while the app is closed.
- **Per-category budgets.** VS-12 implemented an *overall* expense-budget guard (no per-category table),
  yet PRD 5.5 and Budget Overview (Screen 9) imply per-category limits. Confirm whether per-category
  budgets exist or the category bars are informational only (spent vs. a derived share).
```
