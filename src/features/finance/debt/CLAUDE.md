# Debt Feature Context

## Domain Responsibility
People ledger — informal and formal loans in both directions (`lent`: they owe me,
`owed`: I owe them), with repayments, optional terms, due dates and reminders.

## Database Tables
- `debts` — id, person_name, amount (borrowed / lent), direction, date, due_date
  (nullable), status (pending | settled), note, settled_at, account_id (the wallet the
  loan went through, VS-44), deleted_at (soft delete), and terms (VS-54):
  total_to_repay (nullable — interest included), instalment_count,
  instalment_frequency (`weekly` | `monthly`), first_instalment_date.
- `debt_payments` — each repayment (VS-44): debt_id, amount, account_id, date, note,
  deleted_at, and `instalment` (VS-54: which instalment it paid, or NULL).

## Key Business Rules
- **Debts move money** (VS-44): the loan moves its `account_id` wallet by `amount`;
  each repayment moves its wallet back. Never income or spending — only wallet balances
  read these tables (by SQL, in `accounts.balance`).
- **Repayable = `total_to_repay ?? amount`** (VS-54). The user types the total to repay
  rather than a rate. Outstanding = repayable − live repayments; a repayment or settle
  that reaches the repayable total settles the debt; removing one reopens it. The cost
  is `repayable − amount`; `debt.terms.loanCost` shows an equivalent flat monthly rate
  over the term (loan date → last instalment, else due date). Every reader of "still
  owed" uses repayable: the ledger totals, Reports, net worth, committed money.
- **Equal instalments** (VS-54, optional): `count` instalments from
  `first_instalment_date`, weekly or monthly; dates derived by `utils/cycleDate`,
  amounts by `utils/instalments` (equal, the last takes the remainder). "Mark paid"
  records a repayment of exactly that instalment (capped at what is still owed), tied by
  `instalment`; "Undo" soft-deletes it. Free repayments still work alongside.
- **Committed money** counts a scheduled debt's unpaid instalments due by month end, not
  its whole balance (user decision); an unscheduled debt counts once its due date falls in
  the month.
- Terms are set when the debt is created; there is no terms edit yet.
- Reminders (`debt.reminders.dueReminders`, pure; delivered on app open by
  `DebtReminderScheduler`): a debt without instalments — 3 days before its due date
  (warning), daily after (overdue), stop when settled. A scheduled debt (VS-55) ignores
  its due date: one grouped reminder for its overdue instalments (their total, from the
  earliest), and one for its next instalment once within `DEBT_DUE_SOON_DAYS`. The
  notification names the instalment (`debtDueDate.bodyInstalment*`).
- Person names are free text — no contact integration.

## Files
- `DebtListScreen.tsx`, `DebtDetail.tsx` (+ `DebtInstalments.tsx`, `RepaymentSheet.tsx`),
  `DebtForm.tsx` (+ `DebtTermsFields.tsx`, `WalletField.tsx`)
- `debt.service.ts` (CRUD, totals, reminders), `debt.payments.ts` (repayments,
  `payInstalment`), `debt.terms.ts` (pure instalments and cost), `debt.reminders.ts` (pure reminder
  rules), `debt.validation.ts`
  (terms), `debt.hooks.ts`, `debt.types.ts`
