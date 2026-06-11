# Finance Gatekeeper — Product Document

## 1. Problem Statement

When income arrives, nothing stands between the money and impulse spending. Expenses go untracked, emergencies destroy plans, and future projects never get funded. This app gives full visibility and control over personal finances — forcing discipline through allocation, daily logging, and real-time alerts — so every franc works toward a purpose.

## 2. Target User

A salaried professional in Central/West Africa (initially the builder) who also earns irregular income from freelance work and occasional e-commerce. Money flows through mixed channels, cash is common, informal lending is frequent, emergencies are unpredictable. Currency is **FCFA only**.

## 3. Core Philosophy

The app is a **financial gatekeeper**, not a tracker. Income gets allocated before it can be spent. Every franc is assigned a job. Spending freedom is limited to what remains after obligations, savings, and projects are funded.

---

## 4. App Modes

- **Learning Mode (Month 1):** Observation only. User logs every expense honestly. No budgeting or allocation. End-of-month report establishes the spending baseline.
- **Control Mode (Month 2+):** Full system activates. Income is allocated by percentage. Budgets are enforced. Alerts fire. Month-over-month trends are surfaced.

---

## 5. Features

### 5.1 Income Management
- Every income entry tagged by source: **Salary, Freelance, E-commerce**.
- Sources are reported independently even when funds share an account.
- Irregular income triggers allocation immediately on entry.
- Each income entry is optionally tagged with the physical account it lands in (e.g., Bank, MTN MoMo). Used for account balance tracking; does not affect the allocation system.

### 5.2 Allocation System
Logging income opens an **allocation screen** that distributes funds by user-defined percentages in strict priority:
1. **Emergency Fund** — first, always.
2. **Savings** — second.
3. **Projects** — third, split across active projects by priority ranking.
4. **Expenses** — the remainder becomes the spending budget.

Rules:
- Percentages are **locked per month**, adjustable for the next.
- Emergency fund has a **target**; once met, its % auto-redistributes proportionally to the remaining buckets.
- Priority order and percentages are editable in Settings.

### 5.3 Daily Expense Logging
- **Manual entry:** amount, category, subcategory, optional note.
- **Quick-add:** user-configurable shortcuts (e.g., "Taxi 500 FCFA").
- **Recurring expenses:** rent, data, electricity auto-log on schedule; editable/skippable.
- **Zero-day confirmation:** if nothing logged by end of day, app asks the user to confirm a no-spend day.
- **Edit / Delete:** tapping an existing expense row opens a pre-filled edit form. Any field (amount, category, note, date) can be corrected and saved. The over-budget check re-runs when the amount changes. Expenses can be deleted with a one-step confirmation modal.
- Each expense is optionally tagged with the account it is paid from (e.g., Cash, Orange Money). Pre-fills from the default account.

### 5.4 Categories & Subcategories
Defaults (all user-editable: add, rename, delete):

| Category      | Subcategories                                         |
| ------------- | ----------------------------------------------------- |
| Housing       | Rent, Electricity                                     |
| Transport     | (user defines: taxi, moto, fuel, bus, etc.)           |
| Food & Drink  | Raw food / Ingredients, Eating out, Groceries, Drinks |
| Communication | Phone data, Phone credit                              |
| Shopping      | Clothing, Personal care, Household items              |
| Gifts & Help  | Gifts, Financial help to others                       |
| Health        | Pharmacy, Consultation                                |
| Bills         | (user defines based on recurring obligations)         |
| Other         | Uncategorized                                         |

Category is required on every expense; subcategory is optional but encouraged.

### 5.5 Budget Alerts & Overspending Protection
- Warning shown when an expense pushes a category over budget (e.g., *"This puts you 3,200 FCFA over Food."*).
- App **does not block** spending — it creates friction.
- Stronger alert when total monthly expense budget is exceeded.

### 5.6 Emergency Fund
- User sets a target (e.g., 500,000 FCFA). A % of every income flows in until met.
- Dashboard shows progress (e.g., *"320,000 / 500,000 — 64%"*).
- On target reached: % auto-redistributes to savings, projects, expenses proportionally.
- If dipped into, allocation resumes until restored.

### 5.7 Savings
- Separate from emergency fund. Money set aside for non-emergency future use.
- Funded by its own percentage. Optional named goals with target amounts and timelines.

### 5.8 Project Funding
- User creates projects with name, target amount, optional deadline.
- Multiple projects active at once; project % split by **drag-to-reorder priority**.
- Each project shows funded amount, remaining, and estimated completion date based on current rate.
- When disruptions hit, app recalculates timelines and offers options: **redistribute, accept delay, or adjust priority**.

### 5.9 People Ledger (Informal Debt)
- Tracks money **lent** and money **owed**: person, amount, date, optional due date.
- Reminders fire on/after due date.
- Money owed to you is **not** counted as income until actually received.
- Money you owe factors into expense obligations.

### 5.10 Month-Over-Month Comparison
- Bar charts compare category spending across months; pie chart shows current breakdown.
- Highlights increases/decreases and flags optimization opportunities (e.g., *"Food spending up 18% over 2 months"*).

### 5.11 Reports
**Weekly:** total spent vs. weekly average, top categories, highest-spend days, on-track status.

**Monthly:** income vs. expenses, allocation performance per bucket, category/subcategory breakdown with charts, fund and project progress, ledger summary, MoM comparison, optimization suggestions.

### 5.13 Navigation & Action Bar

- Every pushed screen (forms, detail views, list screens outside the tab bar) shows a header with a back button. Form screens show "Cancel" to signal that navigating back discards unsaved changes.
- The Transactions tab action bar supports two styles, selectable in Settings:
  - **Explicit buttons (default):** Quick Add as a compact secondary button; + Log Expense as the primary button — both always visible.
  - **Speed dial:** a single "+" FAB that expands to Log Expense and Quick Add as labelled options.
- Log Income is accessible from the Dashboard `QuickActionBar` only, where the allocation and budget-pace impact is immediately visible on screen.

---

### 5.14 Accounts & Payment Channels

The app tracks the physical wallets money moves through — separate from the logical allocation buckets (Emergency Fund, Savings, etc.).

**Default accounts (seeded on first run):** Cash · MTN MoMo · Orange Money. Users can add more (bank accounts, cards, other mobile money services), rename, hide, or change the default.

**Account purpose labels:** Each account carries a purpose: `Spending | Saving | Emergency | General`. This is informational — it helps the user deliberately assign a role to each wallet (e.g., "MoMo is my savings wallet"). The allocation system remains bucket-based and does not auto-deposit into designated accounts; that is the user's intentional action via manual contributions or transfers.

**Balance tracking:** Account balances are computed from transaction history (not stored), starting from an optional opening balance the user provides when creating the account:

```
balance = opening_balance
        + income credited to this account
        − expenses debited from this account
        + transfers received
        − transfers sent
        − manual fund contributions sourced from this account
        − manual project contributions sourced from this account
```

Automated allocation deposits carry no account tag and do not affect balances — they are logical intent, not physical movements.

**Transfers:** Moving money between accounts (e.g., Cash → MTN MoMo, MoMo → Bank) is logged as a transfer. Transfers adjust both account balances and appear in the transaction feed with a `⇄` icon. Transfer entry point: Transactions tab FAB.

**Manual fund and project contributions:** When the user manually deposits into the Emergency Fund, Savings, or a Project outside the automated allocation flow, they specify the source account. This decreases the source account balance and increases the fund/project balance.

**Analytics:** The Accounts overview shows, per account: live balance, purpose badge, and what percentage of this month's total income and expenses flowed through that account. This surfaces behavioral patterns — e.g., "70% of my expenses are paid in cash" — enabling intentional decisions about which wallet to use for what.

---

### 5.12 Notifications

| Trigger                                    | Message                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| End of day, no expenses logged             | "How did you spend today? Log your expenses or confirm a zero-spend day."                    |
| Zero-day confirmation needed               | "Did you really spend nothing today? Confirm to keep your streak."                           |
| Expense pushes category over budget        | "This puts you 3,200 FCFA over your Food budget."                                            |
| Project timeline changes due to disruption | "Your e-commerce launch is now estimated for March instead of February. Tap to see options." |
| Debt due date approaching/passed           | "Reminder: X owes you 15,000 FCFA. Due date was 2 days ago."                                 |

---

## 6. Information Architecture

**Bottom tabs:** Dashboard · Transactions · Budget · Projects · Reports. Each tab header contains a gear icon (top-right) that opens the Settings screen.

**Transactions tab:** Shows income entries and expense entries together in a single unified feed, grouped by day with a date section header. Default scope is the current calendar month; prev/next arrows navigate between months. A category chip row filters within the selected month. Expense rows are tappable (opens the expense edit screen); income rows are read-only in this view. Type is distinguished by a colored left border (green = income, muted = expense). Each row shows a category or source icon (Ionicons) beside the label; user-created custom categories without a mapped icon fall back to a color-letter avatar.

**Accounts:** Accessible via a compact Wallets section on the Dashboard. Shows live balance per account. Tap to open AccountsOverview, then tap an account card for its full transaction history and monthly analytics.

**Key screens:** Income Allocation (on income entry), Quick-Add grid, Category Management, Project Detail (progress + priority), People Ledger, Expense Detail/Edit, Accounts Overview, Account Detail, Transfer Log, Settings (app mode, reminder time, notifications, action bar style, backup).

---

## 7. Security

- **PIN protection** on app launch.
- All financial data stored locally on-device as source of truth.
- **Cloud backup via Supabase** (auth + DB) for recovery on phone loss.

---

## 8. Tech Stack

| Layer         | Technology                                                                  |
| ------------- | --------------------------------------------------------------------------- |
| Mobile App    | React Native (Expo)                                                         |
| Local Storage | SQLite (structured financial data)                                          |
| Cloud Backend | Supabase (auth, database backup, sync)                                      |
| Charts        | React Native chart library (react-native-chart-kit or Victory Native)       |
| Notifications | Expo Notifications (local scheduled)                                        |

---

## 9. Data Model (High Level)

- **User:** PIN, preferences, allocation %s, mode (learning/control), action bar style.
- **Account:** name, type (cash/mobile_money/bank/card), purpose (spending/saving/emergency/general), opening_balance, is_default. Balance derived from transaction history.
- **Transfer:** from_account, to_account, amount, date, note.
- **Income:** amount, source, account (optional), date.
- **Expense:** amount, category, subcategory, account (optional), note, date, is_recurring.
- **Category / Subcategory:** name, type (default/custom), parent.
- **Allocation:** month, emergency_%, savings_%, projects_%, expenses_%.
- **Emergency Fund / Savings:** target_amount, current_amount.
- **Project:** name, target, funded, priority_rank, deadline?, status.
- **Debt:** person, amount, direction (lent/owed), date, due_date?, status.
- **Quick Add Template:** label, amount, category, subcategory, default_account.
- **Recurring Expense:** template, frequency, next_due_date.

---

## 10. Development Phases

1. **Foundation:** Expo scaffold, PIN auth, SQLite, income & expense logging, categories.
2. **Daily Habits:** quick-add, recurring expenses, daily reminders, zero-day flow, transaction list + filters.
3. **Allocation & Budgeting:** allocation engine, income allocation screen, category budgets, over-budget alerts, emergency fund & savings.
4. **Projects & Debt:** projects with priority funding, timeline recalculation, people ledger with reminders.
5. **Insights & Reports:** weekly + monthly reports, charts, MoM comparison, optimization suggestions.
6. **Cloud & Sync:** Supabase auth + backup, local-first sync, recovery flow.

---

## 11. Success Metrics (Personal)

- **Logging consistency:** every day for 30 days.
- **Budget adherence:** actual spend stays within allocated expense budgets.
- **Fund growth:** emergency, savings, and project funds growing monthly.
- **Expense reduction:** MoM spending trending down.
- **Project completion:** at least one project fully funded and launched within estimated timeline.

---

## 12. Future Considerations (Out of Scope)

Multi-currency · shared household budgeting · bank/mobile money API import · CSV/PDF export · AI coaching · public release with onboarding, accounts, and freemium model.
