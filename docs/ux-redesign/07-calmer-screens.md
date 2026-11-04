# 07 — Calmer screens: one thing at a time (VS-94)

Written 2026-11-04 after the question *"isn't there a lot of information on each screen, even
if it is relevant?"* It builds on [03-research.md](03-research.md) (R1 complex apps, R2
progressive disclosure, R4 tutorials, R6 cognitive load) and adds the sources below. The same
evidence labels apply.

## 1. What the sources say

<a id="r17"></a>
### R17 — NN/g, *Bottom Sheets: Definition and UX Guidelines* (2023)
<https://www.nngroup.com/articles/bottom-sheet/> · **Principle** (read in full)

Says: a bottom sheet provides "contextual details or controls" and is a form of progressive
disclosure, so it is "not suited for displaying always needed information". It is for
"interruptions or a fork in the road", **not** "to replace typical page-to-page user flows"
and not for complex content. Most failures come from no clear way to dismiss, **stacking sheets
on top of each other**, and hiding background content the user needs. Back must close it, and
a visible Close button beats relying on the grab handle. The "easier to reach with a thumb"
argument is called "largely incorrect".

Applies to: a sheet holds the *second* answer to a figure (money in/out behind the month
figure) or a closed step of the path. Forms with several fields and the category detail stay
full screens. The skip warning on My path replaces the sheet's content instead of opening a
second sheet. Every new sheet has a Close button.

<a id="r18"></a>
### R18 — Material Design 3, *Bottom sheets*
<https://m3.material.io/components/bottom-sheets> · **Standard** (search summary)

Says: *standard* sheets complement the screen and stay while the user works with it; *modal*
sheets block the screen behind a scrim and can be dragged down to dismiss.

Applies to: the app's `BottomSheet` is modal, which fits short, focused detail. No standard
(persistent) sheet is needed.

<a id="r19"></a>
### R19 — Duolingo, *Introducing the new Duolingo learning experience* (2022)
<https://blog.duolingo.com/new-duolingo-home-screen-design> · **Pattern** (read in full)

Says: learners were "not sure whether they're using Duolingo the 'correct' or 'best' way", so
the home became "a clear path to follow". You "can see how you're progressing down the path",
and tapping a node opens a short popup about it. Criticism at launch (NBC, Oct 2022) was the
loss of choice: learners could no longer pick the next lesson.

Applies to: My path already had the problem Duolingo describes. It showed five cards of equal
weight, so every step looked as urgent as the current one. A road with one open node answers
"where am I, what's next" at a glance. The criticism is already handled: skipping ahead
stays allowed (journey decision #2), and recording tools are never gated.

<a id="r20"></a>
### R20 — Monzo, *The new and improved Home screen* (2023)
<https://monzo.com/blog/the-new-and-improved-home-screen> · **Pattern** (read in full)

Says: Home summarises "latest activity … in one place", with "spotlights that you can tap into
for more detail", and things surface "at the most appropriate time".

Applies to: Home's month card keeps one figure and taps into the rest. The path card speaks
up only when something changed (a new step). The post says nothing about what Monzo removed
from Home, so I claim nothing about it.

<a id="r21"></a>
### R21 — Progressive (contextual) onboarding, practitioner consensus
Userpilot, *Progressive onboarding*; UX Planet, *Mobile onboarding: interact, don't tell* ·
**Pattern** (vendor blogs, weaker evidence)

Says: teach a feature when the user reaches it, one thing at a time. Avoid permanent tooltips,
re-showing dismissed tips, and front-loaded tours. This agrees with R4 (NN/g: tutorials are
skipped and forgotten).

Applies to: explanations show once at the point of use and go for good on *Got it*
(`components/FirstTimeHint`). Home announces a new step once, and opening My path clears it.

## 2. Where the screens stood

| Screen | Before VS-94 | Assessment |
|---|---|---|
| Home | Six cards. The month card carried the figure, a bar, *spent of*, a %, the pace, In/Out and an imprévus line. The path card repeated the days logged that the month card already showed. | Too much on the first screen of the day (R6, R1 #8) |
| My path | An intro sentence, then five identical cards, each with a pill, goal and preview. Skipped steps were open inline. | Hard to see where you are (R19). Text everywhere |
| Budget | Already cut to five figures with sheets for the sums (UX-13) | Leave as is |
| Reports | Already folded into groups that open by step (UX-14) | Leave as is |

## 3. What VS-94 changed

1. **My path is a roadmap.** One vertical line, one node per step: a check once passed, a ring
   where you are, a lock ahead, a dashed ring for a skipped step. The line is green as far as
   you've come. Only the current step is open (goal, progress, next action). Every other step
   is one line and opens in a sheet with its goal, status, a skipped step's work, and *Skip to
   this step* for the next one. The skip warning shows inside that sheet.
2. **The intro explains itself once.** The permanent sentence became a one-time hint that
   also says "tap any step".
3. **Home's month card answers one question.** Money in/out and the imprévus moved to a
   *Details* sheet. The pace chip and *Details* share one row, and so do *Plan a budget* and
   *Details* when there is no plan.
4. **Home's path card says what changed, once.** It no longer repeats the days logged. It
   shows the step and the complete months, and adds *New step* with the step's goal only when
   a step was reached since My path was last opened.

## 4. Deliberately not changed

- **No sheet for forms or the category detail.** These are multi-field tasks or destinations
  (R17).
- **Nothing hidden by step.** The step still sets emphasis, never access (journey decision #1).
- **No new tour.** Hints are one line, show once, and only where a screen gains a concept.

## 5. Next candidates (not built; ask first)

- Home still has *Today* (today's spending, the daily figure, a 7-day sparkline) under the
  Wallets card. The daily figure could join the month card and the sparkline could move to
  Reports, which would make Home four cards.
- *Next for you* and the path card both prompt by step when nothing is due. One of them could
  stop doing so.
- Test with users (06 §13): does anyone miss In/Out on the card itself?
