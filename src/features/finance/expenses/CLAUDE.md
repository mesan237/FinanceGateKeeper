# Expenses Feature Context

## Domain Responsibility
Handles daily expense logging, quick-add templates, recurring expenses, zero-day confirmation, category/subcategory management, and the transaction list.

## Database Tables
- `expenses` — id, amount (integer in FCFA), category_id, subcategory_id, note, date, is_recurring, account_id, is_unplanned (the "imprévu" flag, VS-38), event_id (the occasion it was for, VS-61; refunds take their purchase's and follow it), created_at
- `categories` — id, name, parent_id (null = top-level), is_default, sort_order
- `quick_add_templates` — id, label, amount, category_id, subcategory_id
- `recurring_expenses` — id, amount, category_id, subcategory_id, note, frequency (monthly|weekly|weekdays), next_due_date, is_active
- `zero_days` — id, date, confirmed_at

## Key Business Rules
- Amount is stored as integer (no decimals in FCFA).
- Every expense MUST have a category. Subcategory is optional.
- Deleting a category requires reassigning its expenses to another category first.
- Default categories cannot be deleted, only hidden.
- Quick-add logs an expense from a template after a one-field confirm sheet (date only, defaulting to today) — no other fields to fill in.
- Recurring expenses auto-log when `next_due_date <= today` on app open. After logging, advance `next_due_date` by frequency.
- **Weekdays (VS-60)** repeat Monday to Friday (`utils/weekdays`): Friday advances to
  Monday, and a weekday bill created or switched with a weekend date starts on the
  Monday. Being recurring, every occurrence counts as fixed (`spendKindOf`), so the
  routine (the taxi to work) never reads as spending to cut. Migration 048 rebuilt the
  table for the new CHECK value; Supabase stores `frequency` as plain text, no patch.
- Zero-day: if no expenses exist for today AND no zero-day confirmed, the daily reminder triggers. User confirms "I spent nothing" or navigates to log.
- Before saving any expense, call `budget.service.ts` `checkOverBudget()` to determine if alert is needed.

## Default Categories
Seeded by migration `001_create_categories_table.ts` from `@/constants/categories`
(`DEFAULT_CATEGORIES`). Array order sets each row's `sort_order`.
```
Food: Groceries, Restaurant, Snacks
Transport: Taxi, Fuel, Public Transport
Bills: Rent, Electricity, Water, Internet, Phone
Health: Pharmacy, Doctor
Entertainment: Streaming, Outings
Education: Books, Courses
Shopping: Clothing, Household
Other: Miscellaneous
```

## Files in This Feature
- `ExpenseLogScreen.tsx` — Manual entry form
- `QuickAddScreen.tsx` — Template grid
- `RecurringExpensesScreen.tsx` — Manage recurring list
- `CategoryManager.tsx` — CRUD for categories/subcategories
- `ZeroDayPrompt.tsx` — Confirmation modal
- `TransactionList.tsx` — Filterable chronological list
- `CategoryPicker.tsx` — Selector used in forms
- `expenses.hooks.ts` — useExpenseLog, useTransactions, useQuickAdd, useRecurring, useCategories, useZeroDay
- `expenses.service.ts` — All database operations for this domain
- `expenses.types.ts` — Expense, Category, Subcategory, QuickAddTemplate, RecurringExpense, ZeroDay
- `expenses.costType.ts` — fixed/variable tags, and `spendKindOf`: the one rule for how an expense counts (imprévu → unexpected, recurring → fixed, else its tag). Used by the Reports typical month and the observed essentials
- `expenses.essentials.ts` — `getObservedFixedAverage`: fixed spending averaged over the complete months before this one (VS-50). Read by `goals` to size an emergency reserve
