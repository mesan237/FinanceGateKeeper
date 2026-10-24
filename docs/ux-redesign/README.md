# Finance Gatekeeper — UX Audit, Information Architecture & Redesign Plan

**Audited:** 2026-10-24, branch `feat/vs-63-journey` at `3ee699c` (VS-63 "My path" committed,
not merged). Audit and planning only: **no application code, schema, test or config was
changed.** **Decisions recorded 2026-10-24:** D1–D10 approved as recommended, D-arch-2
approved (`journey → expenses`), the repeated *Budget left* dropped, public release in a few
weeks — see [06 §14.0](06-constraints-roadmap-validation.md#140-decisions-recorded-2026-10-24)
and the release cut in [06 §12.1](06-constraints-roadmap-validation.md#121-release-cut-public-release-in-a-few-weeks-decided-2026-10-24).
Implementation still waits for a go-ahead per slice.

## How to read this report

| File | Contents | Report sections |
|---|---|---|
| this README | Executive summary, evidence labels, top findings, decisions needed | 1, 14 (summary) |
| [01-product-and-current-state.md](01-product-and-current-state.md) | What the product is for, who it serves, screen and journey inventory, user questions per screen | 2, 3, 6 |
| [02-audit-findings.md](02-audit-findings.md) | Detailed findings F-01 … F-24 with code evidence | 4 |
| [03-research.md](03-research.md) | Sources, what each says, how it applies | 5 |
| [04-strategy-onboarding-ia.md](04-strategy-onboarding-ia.md) | Observation → optimisation strategy, onboarding redesign, revised IA | 7, 8, 9 |
| [05-screen-proposals.md](05-screen-proposals.md) | Screen-by-screen redesign with text wireframes | 10 |
| [06-constraints-roadmap-validation.md](06-constraints-roadmap-validation.md) | Technical constraints, regression risk, roadmap, acceptance criteria, validation, open questions | 11, 12, 13, 14 |

Related documents this report builds on (not replaced): `docs/finance-gatekeeper-audit/`
(financial logic, glossary, gap analysis, Oct 2026) and `docs/ux-audit/` (first-run audit,
Sep 2026 — partly obsolete: it describes Learning/Control mode and allocation, removed in VS-34).
`docs/PRODUCT DOCUMENT.md` also still describes the parked allocation model; the code and
`docs/finance-gatekeeper-audit/GLOSSARY.md` are the source of truth.

### Evidence labels

Every claim in this report carries one of these:

- **Verified** — I read the code path; a file/line is cited.
- **Inferred** — follows from the code, but I did not see it rendered (I could not run the
  app on a device; see limitations).
- **Principle** — an established UX principle, with a source in [03-research.md](03-research.md).
- **Pattern** — observed in a real product's public documentation.
- **Interpretation** — my reading of the evidence for this app.
- **Hypothesis** — a belief about users that needs testing before it is relied on.

### Limitations (read before trusting any visual claim)

- **I did not run the app or see any screen.** There are no screenshots in this report.
  Layout, wrapping, density and contrast-on-device are inferred from components, styles and copy.
- **No user research exists.** The only user so far is the builder. Every statement about
  "users" is a hypothesis until tested (validation plan in file 06).
- Monarch's help centre returned HTTP 403; I cite only a search summary for it. I found no
  primary documentation of a Copilot Money "safe/free to spend" figure and make no claim about one.
- Colour contrast ratios were computed by hand from hex values in `src/constants/colors.ts`
  (WCAG relative-luminance formula); they should be confirmed with a contrast tool.

---

## 1. Executive summary

**The app's financial engine is honest and well-defined; its presentation does not yet let
the user read it at a glance.** The glossary distinguishes plan figures from money, observed
from estimated, and fixed from variable with real care. The screens then show several of those
figures side by side, under near-identical names, with equal visual weight, from day one.

The five problems that matter most:

1. **"How much can I spend?" has six answers with overlapping names** (F-01). The Dashboard
   and Budget heroes say *Left to spend*, which the glossary defines as "a plan figure, not
   money". The Budget tab repeats the same number as *Budget left*, then shows *Safe to spend*
   (a cash figure), *Safe daily spend* (a plan figure per day) and the Dashboard shows a *daily
   pace* computed a third way. A user cannot tell which one to act on. This is the single
   biggest risk to trust.
2. **The app tells the user to observe while pushing them to control** (F-02). "My path" says
   step 1 is *Observe — log everything without changing your habits* for three complete months.
   Meanwhile onboarding teaches "Budget by category", the Dashboard hero asks to "Set a monthly
   budget", and Reports opens with Net worth (the last step). Each screen speaks from a
   different stage.
3. **The Observe step is long and gives almost no short-term feedback** (F-03). A month counts
   only at ≥80% of *all* its days logged, so a user who starts after about the 7th can never
   complete their first month; a missed day can never be marked as no-spend afterwards; the
   path card shows "0 of 3 complete months" for weeks. Diligent users may see no progress.
4. **Dense screens give every figure the same weight** (F-04, F-05). The Budget tab can show
   ~20 figures before the category list, then ~6 per category. Reports has ten sections, and
   its first three ignore the month stepper placed below them.
5. **Colour and contrast work against the meaning** (F-08, F-09). Green means "on track", but
   also "variable spending" and "everyday — the habits you can change", which are the buckets
   the user should reduce. The brand green used for 35 text links is about 2.5:1 on white,
   below the WCAG AA minimum of 4.5:1.

**What to preserve.** One glossary and one budget-health rule; the honest em-dash when there is
no budget; status chips in words, not colour alone; collapsed Budget insights; the category
detail screen, which is already organised around questions (where did it go, why, what next);
"provisional" labels and Estimate vs actual; recording tools that are never gated.

**The direction proposed.** No new engine and no new screens of substance. Most of the value
comes from the presentation layer:

- **One name per figure, one figure per question** — rename and de-duplicate (copy + layout).
- **Stage-aware emphasis** — the journey step (already computed) chooses what each screen
  leads with; nothing is hidden (this extends VS-64, which the user already approved in principle).
- **Make Observe rewarding** — show this month's logged days, let the user mark missed days as
  no-spend, and say plainly when the first month cannot count.
- **Progressive disclosure, one level deep** — breakdowns behind one tap, never two.
- **A semantic colour and contrast pass.**

Roadmap: Phase 0 (validate, 1 week) → Phase 1 language + stage emphasis + onboarding (P0) →
Phase 2 visual hierarchy of Home, Budget, Reports → Phase 3 contextual insight and control →
Phase 4 optimisation and accessibility hardening. Details and acceptance criteria in file 06.

---

## Decisions requiring your approval (summary)

Full list with options and my recommendation in [06 §14](06-constraints-roadmap-validation.md#14-open-questions-assumptions-and-decisions).
Decisions you have already made (journey card + tab, previews not hiding, skip allowed,
safe-to-spend on the Budget tab only, expected-income default) are **respected, not reopened**.

| # | Decision | My recommendation |
|---|---|---|
| D1 | Names for the plan and cash figures | *Left in your plan* / *Free cash* (or keep *Safe to spend*) — F-01 |
| D2 | Stage-aware hero on Home | Observe: "spent so far + days logged"; Plan onward: plan left |
| D3 | One daily figure | Use the Budget's "remaining ÷ days left" everywhere |
| D4 | First month for mid-month starters | Explain it first (copy only); decide prorating separately |
| D5 | Marking past days as no-spend | Allow up to 7 days back |
| D6 | Reports order | Month first; "over time" second; net worth last |
| D7 | Drawer | Group money objects apart from app settings; drop "Soon" rows |
| D8 | Expense form | Keep amount, category, wallet, *Unexpected* and a date chip visible; fold event + note into "More details" — only if a timed test shows it helps |
| D9 | Colour semantics | Neutral tones for spending kinds; green only for "good/on track" |
| D10 | Audience | Design copy for a non-expert, even while the builder is the only user |
| D-arch-1 | Onboarding wallet step | Open Accounts by path first (no new edge) |
| D-arch-2 | Journey reads this month's logged days and confirms missed days | Approve `journey → expenses` (avoids a second definition of "logged day") |
