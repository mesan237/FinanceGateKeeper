# Expenses Feature Context

## Domain Responsibility
Handles daily expense logging, quick-add templates, recurring expenses, zero-day confirmation, category/subcategory management, and the transaction list.

## Database Tables
- `expenses` — id, amount (integer in FCFA), category_id, subcategory_id, note, date, is_recurring, created_at
- `categories` — id, name, parent_id (null = top-level), is_default, sort_order
- `quick_add_templates` — id, label, amount, category_id, subcategory_id
- `recurring_expenses` — id, amount, category_id, subcategory_id, note, frequency (monthly|weekly), next_due_date, is_active
- `zero_days` — id, date, confirmed_at

## Key Business Rules
- Amount is stored as integer (no decimals in FCFA).
- Every expense MUST have a category. Subcategory is optional.
- Deleting a category requires reassigning its expenses to another category first.
- Default categories cannot be deleted, only hidden.
- Quick-add logs an expense from a template after a one-field confirm sheet (date only, defaulting to today) — no other fields to fill in.
- Recurring expenses auto-log when `next_due_date <= today` on app open. After logging, advance `next_due_date` by frequency.
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
