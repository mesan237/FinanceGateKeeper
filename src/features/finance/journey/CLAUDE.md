# Journey Feature Context

## Domain Responsibility
The step-by-step path to control over spending (VS-63): **Observe → See → Plan →
Optimize → Grow**. It shows the user which step they are on, what moves it forward and
what the next step unlocks. The "My path" tab and the dashboard's path card.

## No Own Tables
The user's three answers are `baseline_facts` kinds (budget slice), written through
`budget.baseline.setBaselineFact` and read with `getBaselineFactValue`:
- `picture_reviewed` (1): "I've seen it" on See
- `journey_skipped` (0–4): the step skipped ahead to
- `journey_reached` (0–4): how many steps the evidence has passed, so a step never locks again

New kinds need no migration, so the slice shipped without one and without a Supabase patch.

## Key Business Rules
- **The step comes from the data, never from a mode switch.** VS-34's Learning mode
  hid budgeting behind a flag that never flipped. `getJourney` works the step out on
  every read, so an existing user lands on their real step.
- **Pass rules**, in order (a later step never counts before the earlier ones):
  1. Observe: the starting point's three complete months exist (`reports.getStartingPoint`).
  2. See: the user tapped "I've seen it".
  3. Plan: a complete month after the starting point had a budget: an envelope or an
     explicit `total_budget` (read by SQL). The running month never counts.
  4. Optimize: a complete month, from the planned one on, whose variable spending is
     under the starting point's variable average.
  5. Grow: never "done"; it is where the path continues.
- **Steps never lock again.** When the evidence passes more steps than stored,
  `journey_reached` is raised. Correcting an old entry cannot send the user back.
- **Skip ahead** only to the next step, after a warning (an extra one while still
  observing: the starting point gets less honest). Steps jumped over read "Skipped" and
  still show their action, so they can be completed. Skips never go backwards.
- **Locked steps are previews**, never hidden: their goal plus what the step before
  unlocks.
- Recording tools (logging, wallets, debts, tontines, transfers) are never gated.

## Cross-Feature
- `journey → budget`: baseline facts, and `BaselineCard` (the setup checklist) on top
  of the path.
- `journey → reports`: `getStartingPoint`, and `getSpendingProfile` for one month's
  variable spending (`ProfileAverage` in the types).
- `dashboard → journey`: `JourneyCard`. The tab route renders `JourneyScreen`.
- Nothing else imports `journey`. VS-64's previews on other screens will read the step
  from a shared provider in `components/` (like `AttentionProvider`), not by importing
  this slice.

## Files
- `journey.service.ts`: `resolveJourney` (pure), `getJourney`, `markPictureReviewed`, `skipToStep`
- `journey.steps.ts`: `JOURNEY_STEPS`, the order. Kept apart so screens read it without the database
- `journey.hooks.ts`: `useJourney`
- `journey.types.ts`
- `JourneyScreen.tsx`: the "My path" tab, with the skip warning
- `JourneyStepDetail.tsx`: a step's progress and next action
- `JourneyCard.tsx`: the dashboard card
