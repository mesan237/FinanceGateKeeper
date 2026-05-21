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

**Bottom tabs:** Dashboard · Transactions · Budget · Projects · Reports.

**Key screens:** Income Allocation (on income entry), Quick-Add grid, Category Management, Project Detail (progress + priority), People Ledger, Settings (PIN, percentages, notifications, backup, categories).

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

- **User:** PIN, preferences, allocation %s, mode (learning/control).
- **Income:** amount, source, date.
- **Expense:** amount, category, subcategory, note, date, is_recurring, recurring_schedule.
- **Category / Subcategory:** name, type (default/custom), parent.
- **Allocation:** month, emergency_%, savings_%, projects_%, expenses_%.
- **Emergency Fund / Savings:** target_amount, current_amount.
- **Project:** name, target, funded, priority_rank, deadline?, status.
- **Debt:** person, amount, direction (lent/owed), date, due_date?, status.
- **Quick Add Template:** label, amount, category, subcategory.
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
