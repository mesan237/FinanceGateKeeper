# Funds Feature Context

## Domain Responsibility
Manages emergency fund and savings as a unified "funds" system. Both share the same data model, differentiated by type.

## Database Tables
- `funds` — id, type (emergency | savings), target_amount, current_amount, is_target_met, created_at
- `fund_transactions` — id, fund_id, amount, direction (deposit | withdrawal), reason, date, created_at

## Key Business Rules
- Two funds exist by default: one emergency, one savings. Created on first app setup.
- Deposits happen automatically via the allocation system when income is confirmed.
- Withdrawals are manual — user logs a withdrawal with a reason.
- Emergency fund has a mandatory target. Savings target is optional.
- When `current_amount >= target_amount`, set `is_target_met = true` and trigger redistribution in `budget.service`.
- If emergency fund is withdrawn below target after being met, reset `is_target_met = false` and resume allocation.
- Fund progress = `(current_amount / target_amount) * 100`. If no target (savings), show total only.

## Files in This Feature
- `FundsOverview.tsx` — Side-by-side fund cards
- `FundDetail.tsx` — Transaction history, edit target
- `FundProgressBar.tsx` — Visual progress component
- `funds.hooks.ts` — useFunds, useFundProgress, useRedistribution
- `funds.service.ts` — Deposit, withdraw, progress calc, redistribution trigger
- `funds.types.ts` — Fund, FundType, FundGoal, FundTransaction
