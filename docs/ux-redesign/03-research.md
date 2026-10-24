# 03 — Research: principles, products, and how they apply

Report section 5. Every source below was fetched or searched on 2026-10-24. Where I could read
only a search summary, the entry says so. Each entry separates **what the source says** from
**how I apply it** (Interpretation) and from what still needs testing (Hypothesis).

---

## Established UX principles

<a id="r1"></a>
### R1 — Nielsen Norman Group, *8 Design Guidelines for Complex Applications*
<https://www.nngroup.com/articles/complex-application-design/> · **Principle** (read in full)

Says: promote learning by doing; help users adopt more efficient methods; provide flexible,
fluid pathways (avoid rigid linear flows; let users skip ahead and go back); **reduce clutter
without reducing capability** — keep advanced features available but hidden until relevant,
"staged disclosure, where options are shown … only when they are relevant to the task at hand";
ease transition between primary and secondary information without leaving the main view;
**make important information visually salient**, often by removing nonessential elements. Also:
"the majority of users do not transition to true expert usage."

Applies to: F-02 (stage emphasis, not hiding), F-04 (clutter), F-01 (salience by removal), the
skip-ahead rule already on My path (#3), bottom-sheet breakdowns instead of new screens (#7).

<a id="r2"></a>
### R2 — NN/g, *Progressive Disclosure*
<https://www.nngroup.com/articles/progressive-disclosure/> · **Principle** (read in full)

Says: "disclose everything that users frequently need up front"; initially show "only a few of
the most important options"; base the split on task analysis and usage, checked by testing;
make the path to secondary content obvious and well labelled; **"designs that go beyond 2
disclosure levels typically have low usability"**; staged disclosure (wizards) works when steps
have little interaction and is "problematic when the steps are interdependent."

Applies to: every "tap for breakdown" proposal is **one level** deep (F-04, F-05); onboarding
steps are independent, so a short staged set-up is appropriate (F-13); the Budget planner is
interdependent, so it stays one screen.

<a id="r3"></a>
### R3 — GOV.UK Service Manual, *Learning about users and their needs*
<https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs> · **Principle** (read in full)

Says: write needs as "I need/want/expect to… so that…"; base them on evidence; describe the
problem, not a solution; treat opinions not from users "as assumptions to be proven through
research"; research all kinds of users, especially those who struggle.

Applies to: the needs table in [01 §6](01-product-and-current-state.md#6-user-questions-and-needs-by-screen)
is written this way and **labelled as hypotheses**; the validation plan (file 06 §13) exists
because no user research has been done.

<a id="r16"></a>
### R16 — GOV.UK Service Standard, *Point 4: Make the service simple to use*
<https://www.gov.uk/service-manual/service-standard/point-4-make-the-service-simple-to-use> · **Principle** (read in full)

Says: help users "succeed first time with minimal help"; test usability "frequently with actual
and potential users"; give a **consistent experience from start to finish**.

Applies to: one name per figure across screens (F-01, F-14); one state pattern (F-23).

<a id="r4"></a>
### R4 — NN/g, mobile tutorials study (article at `/articles/mobile-tutorials/`)
<https://www.nngroup.com/articles/mobile-tutorials/> · **Principle with data** (read in full)

Says: in a quantitative test (70 users, 4 apps), deck-of-cards tutorials did **not** change
success (91% vs 94%, p=0.443) or time (93 s vs 85 s); readers rated tasks **harder** (SEQ 4.92 vs
5.49, p=0.047). "Think twice about creating a tutorial for simple applications"; prefer
interactive, contextual help.

Applies to: F-13 — Finance Gatekeeper's onboarding is exactly a four-card deck. Replace with
contextual set-up. **Interpretation:** the study used other apps; the direction, not the
numbers, transfers.

<a id="r5"></a>
### R5 — U.S. Web Design System, *Data visualizations*
<https://designsystem.digital.gov/components/data-visualizations/> · **Principle** (read in full)

Says: use chart types the audience understands (line and bar for unknown audiences); **limit a
visualisation to a central theme with no more than two or three concepts**; "clearly state the
author's intended message as text"; **don't reuse colours for different variables**; meet
contrast; **don't rely on colour alone**; the audience "shouldn't be required to interact with a
visualization to understand its message"; provide text alternatives and a data table.

Applies to: F-08 (green reused), F-10 (colour per rank), F-16 (no text alternative; donut),
F-05 (three proportional charts of the same spending).

<a id="r6"></a>
### R6 — NN/g, *Minimize Cognitive Load to Maximize Usability*
<https://www.nngroup.com/articles/minimize-cognitive-load/> · **Principle** (read in full)

Says: extraneous load is mental effort that does not help users understand the content; avoid
visual clutter; **build on existing mental models**; offload tasks — "every task you eliminate
leaves more mental resources for the decisions that truly are essential."

Applies to: F-01 (the user should not compute which figure applies — the screen should);
F-14 ("Left to spend" maps onto the mental model *money I have*, so it must mean that, or be
renamed).

<a id="r7"></a>
### R7 — NN/g, *Dashboards: Making Charts and Graphs Easier to Understand*
<https://www.nngroup.com/articles/dashboards-preattentive/> · **Principle** (read in full)

Says: dashboards give "at-a-glance information" for quick action; **length and 2D position**
encode quantity best; colour should not encode magnitude and should be a secondary cue for
categories; **pie and donut charts "should be avoided most of the time"**; gauges and 3D also
discouraged. No fixed item count is given — guidance is qualitative: simple, scannable, focused
on one task.

Applies to: progress bars and ranked bar lists (already used) over the donut (F-16); a Home
screen focused on one task (F-01, F-20). **Interpretation:** "Dashboard" is the wrong name for
Home if it is meant to be scanned in seconds; a *Today/Home* focus suits the daily loop better.

<a id="r8"></a>
### R8 — Communicating uncertainty to non-experts
- Kale, Kay & Hullman, *Visual Reasoning Strategies for Effect Size Judgments and Decisions*
  (IEEE TVCG 2020): <https://mucollective.northwestern.edu/files/2020%20-%20Kale,%20Visual%20Reasoning%20Strategies%20for%20Effect%20Size%20Judgements.pdf>
- Wilke, *Fundamentals of Data Visualization*, ch. 16: <https://clauswilke.com/dataviz/visualizing-uncertainty.html>
- Dieckmann, Peters & Gregory, *At home on the range? Lay interpretations of numerical uncertainty ranges* (record): <https://documentacion.fundacionmapfre.org/documentacion/es/bib/153592.do?format=xml>

**Principle** (read via search summaries; the papers themselves not read in full). Says:
omitting uncertainty and showing only point estimates leads to "incredible certitude"; lay
readers interpret ranges inconsistently, with numeracy playing a part; for lay audiences,
strategies that give a strong *intuitive* impression of uncertainty are preferable.

Applies to: F-15 — mark projected and estimated figures visibly and in words ("heading for ≈…",
"your estimate"), and keep "provisional" labels. **Interpretation:** for this app, words beat
error bars; I do not recommend ranges on the main screens.

<a id="r11"></a>
### R11 — W3C WCAG 2.x: 1.4.1 Use of Color (A), 1.4.3 Contrast Minimum (AA), 1.4.11 Non-text Contrast (AA)
<https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast> (and the Understanding pages for 1.4.1 / 1.4.3) ·
**Standard** (search summary; criteria unchanged in 2.2)

Says: text ≥ 4.5:1 (large text ≥ 3:1); UI components and meaningful graphic parts ≥ 3:1, not
rounded (2.999:1 fails); colour never the only means of conveying information.

Applies to: F-09 (2.5:1 green text), F-16 (bars and chart segments), F-08 (colour-only meanings).

---

## Behaviour, trust and context

<a id="r9"></a>
### R9 — The ostrich effect
- Karlsson, Loewenstein & Seppi (2009), *The ostrich effect: Selective attention to information*:
  <https://www.cmu.edu/tepper/faculty-and-research/assets/docs/ppaper-61264983153898-ostrich-effect-1.pdf>
- Counter-evidence: Gherzi, Stewart et al., *The meerkat effect*: <https://openaccess.city.ac.uk/id/eprint/3875/1/The%20meerkat%20effect.pdf>

**Principle, contested** (search summaries). Says: investors looked at their portfolios less
often after bad market news (reported as 50–80% less in Scandinavian data). A later study of
active online investors found monitoring rose after both good and bad days.

Applies to: **Hypothesis only** — that shame-coded visuals (red on the Expense tile, "Over budget"
in red as the biggest number) may make a user open the app less in a bad month, which is exactly
when logging matters most. Supports a neutral, non-judging tone (F-08). Needs testing; the
evidence is from investors, not budgeters.

<a id="r15"></a>
### R15 — CFPB, *4 elements define personal financial well-being* (blog, from the 2015 report)
<https://www.consumerfinance.gov/about-us/blog/4-elements-define-personal-financial-well-being> · **Framework** (search summary)

Says: people with high financial well-being "feel in control of their day-to-day and
month-to-month finances … This is not just about having money … it's about managing it."

Applies to: the success measure "user confidence in understanding their situation" (file 06 §13)
can borrow the *feeling in control* framing; the Observe → Plan path is about this element.

<a id="r12"></a>
### R12 — World Bank, *Global Findex Database 2025*
Figure list: <https://thedocs.worldbank.org/en/doc/be6615202d1f08a25855c8ac2d615122-0050012025/related/Global-Findex-2025-figure-list.pdf> ·
blog: <https://blogs.worldbank.org/en/developmenttalk/digital-technology-is-unlocking-financial-inclusion> ·
**Context data** (secondary summaries; confirm against the report before quoting externally)

Says: in Sub-Saharan Africa 40% of adults had a mobile-money account in 2024 (27% in 2021),
above bank-account ownership (≈38%).

Applies to: wallets (Cash, MTN MoMo, Orange Money) are the user's real "accounts", so wallet
balance accuracy and a visible total deserve Home space (F-11).

---

## Real products (patterns, not styles)

<a id="r13"></a>
### R13 — YNAB, *Assigning Your Money* and *Assigning Future Income*
<https://support.ynab.com/en_us/assigning-your-money-a-guide-SypgkrNJi> ·
<https://support.ynab.com/en_us/assigning-future-income-an-overview-BJsTo0jCq> · **Pattern** (read in full)

Says: *Ready to Assign* "holds the money that still needs a category and alerts you if you've
assigned more than you have"; four states shown with **words and buttons** ("Assign", "Fix
This", "Assigned Too Much"); "you only assign the dollars you have on hand right now"; future
income is anticipated with scheduled transactions, not assigned.

Applies to: Finance Gatekeeper's *Unassigned* strip is the same pattern and works (keep). One
**tension, not a recommendation:** YNAB budgets only money on hand; the user chose
*expected income* as the default budget (Phase 3 decision, respected). The implication for UX is
that the "planned on expected income · X of Y received" line must be visible, not a caption —
because the plan figure can exceed the cash.

<a id="r10"></a>
### R10 — Simple (bank), *Safe-to-Spend*, and why it is fragile
American Banker, *The fintechs stepping into the void left by Simple*:
<https://americanbanker.com/news/the-fintechs-stepping-into-the-void-left-by-simple> · **Pattern + caveat** (read in full)

Says: Safe-to-Spend — balance minus upcoming bills and savings set-asides — was "one of the most
beloved features of Simple." Brian Hamilton (CEO, One): "The algorithms are useful when they're
accurate"; with disconnects or inaccuracies users stop trusting the number. Mark Schwanhausser
(Javelin) argues saving first works better than computing what's left.

Applies to: Finance Gatekeeper's *Safe to spend* is the same idea, computed from **manually
logged** wallet balances — so its trustworthiness depends on balance checks (F-11). Keep it on
the Budget tab (user decision), show when balances were last confirmed beside it, and never make
it the biggest number while balances are unconfirmed. Pay-yourself-first (already built)
matches Schwanhausser's point.

<a id="r14"></a>
### R14 — Monarch Money, *Customizing your dashboard*
<https://help.monarch.com/hc/en-us/articles/360058127551-Customize-Your-Dashboard> · **Pattern** (**page returned HTTP 403; search summary only**)

Says (per summary): the dashboard is a set of widgets (budget, net worth, recurring, spending
trend, transactions, …) that users can hide and reorder; web and mobile layouts are set separately.

Applies to: **Interpretation — not adopted.** User-customised dashboards suit users who already
know what they want to watch. For a single user on a guided path, *stage-aware defaults* do the
same job without asking the user to configure anything. Revisit if the app goes public.

### Products I looked for but could not verify
Copilot Money: I found no primary documentation of a "free/safe to spend" figure (only the App
Store listing describing adaptive budgets and cash-flow views). I make no claim about its design.

---

## How the research shapes the plan (summary)

| Plan element | Evidence type | Sources |
|---|---|---|
| One figure per question; remove duplicates | Principle | R1 #8, R6, R16 |
| Stage-aware emphasis with previews, never hiding | Principle + product history (VS-34) | R1 #3 #6, R2 |
| Breakdowns one tap deep, never two | Principle | R2 |
| Contextual set-up instead of a tutorial deck | Principle with data | R4 |
| Bars over donut; a text sentence per chart | Principle | R5, R7 |
| Status colours only for status; contrast ≥ 4.5:1 | Standard | R5, R11 |
| Projections marked in words | Principle | R8 |
| Balance freshness next to cash figures | Pattern + caveat | R10, R12 |
| Neutral tone on logging and overspending | Hypothesis | R9 |
| Keep the Unassigned / give-it-a-job pattern | Pattern | R13 |
