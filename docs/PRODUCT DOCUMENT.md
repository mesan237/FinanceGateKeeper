# Finance Gatekeeper — Complete Product Document

## 1. Problem Statement

When income arrives, there is no system standing between the money and impulse spending. Expenses go untracked, emergencies destroy plans, and future projects never get funded. The result: being stuck in survival mode instead of building mode.

This app exists to give full visibility and control over personal finances — forcing discipline through allocation, daily logging, and real-time alerts — so that every franc works toward a purpose.

## 2. Target User

The primary user (initially the builder himself) is a salaried professional in Central/West Africa who also earns irregular income from freelance work and occasional e-commerce ventures. Money flows through a mix of channels, cash is common, informal lending between people is frequent, and emergencies are unpredictable. Currency is FCFA exclusively.

## 3. Core Philosophy

The app operates as a **financial gatekeeper**, not just a tracker. Income doesn't just arrive — it gets allocated before it can be spent. Every franc is assigned a job. The user's spending freedom is limited to what remains after obligations, savings, and projects are funded.

---

## 4. App Modes

### 4.1 Learning Mode (Month 1)

During the first month, the app is in observation mode. The user logs every expense honestly. No budgeting, no allocation, no judgment. At the end of the month, the app generates a full report showing where money went, broken down by category and subcategory. This baseline becomes the foundation for all future budgeting.

### 4.2 Control Mode (Month 2+)

From the second month onward, the full system activates. Income gets allocated by percentage. Budgets are enforced. Alerts fire when limits are approached. Month-over-month comparisons reveal trends. The app actively works to keep expenses low and projects funded.

---

## 5. Features

### 5.1 Income Management

- **Manual income tagging:** every income entry is tagged by source — Salary, Freelance, or E-commerce.
- **Separation of income streams:** even if money lands in the same account, the app treats each source independently for reporting purposes.
- **Irregular income handling:** freelance and e-commerce income is logged whenever it arrives. The allocation system applies immediately upon entry.

### 5.2 Allocation System

When any income is logged, the app presents an **allocation screen** that distributes the money according to user-defined percentages in strict priority order:

1. **Emergency Fund** — funded first, always.
2. **Savings** — funded second.
3. **Projects** — funded third, split across active projects by user-defined priority ranking.
4. **Expenses** — whatever remains becomes the spending budget.

Rules:

- Percentages are **locked per month** but can be adjusted for the following month.
- The emergency fund has a **target amount**. Once reached, its percentage automatically redistributes proportionally to the remaining buckets (savings, projects, expenses).
- The user defines and can modify the priority order and percentages from settings.

### 5.3 Daily Expense Logging

This is the heartbeat of the app. Every day, the user records what they spent.

- **Manual entry:** add any expense with amount, category, subcategory, and optional note.
- **Quick-add:** predefined shortcuts for frequent expenses (e.g., "Taxi 500 FCFA", "Lunch 1,500 FCFA"). User-configurable.
- **Recurring expenses:** rent, phone data, electricity, and other predictable costs are entered once and auto-logged on their scheduled dates. User can edit or skip any occurrence.
- **Zero-day confirmation:** if no expenses are logged by end of day, the app asks: "Did you spend nothing today?" The user confirms, keeping the logging habit alive even on no-spend days.

### 5.4 Categories & Subcategories

**Default categories and subcategories:**

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

**Customization:**

- The user can **add, rename, and delete** categories and subcategories at any time.
- Defaults serve as a starting point, not a constraint.
- Every expense must be assigned a category. Subcategory is optional but encouraged.

### 5.5 Budget Alerts & Overspending Protection

- When an expense is being logged that would push a category **over its allocated budget**, the app shows a warning: _"This puts you over budget for Food by 3,200 FCFA."_
- The user can still proceed (the app doesn't block spending — it creates friction and awareness).
- If the total monthly expense budget is exceeded, a stronger alert triggers.

### 5.6 Emergency Fund

- The user sets a **target amount** (e.g., 500,000 FCFA).
- A percentage of every income is allocated to the fund until the target is reached.
- Progress is visible on the dashboard (e.g., "Emergency Fund: 320,000 / 500,000 FCFA — 64%").
- Once the target is met, the emergency fund percentage is **automatically redistributed** to savings, projects, and expenses proportionally.
- If the fund is dipped into for an actual emergency, the allocation resumes until the target is restored.

### 5.7 Savings

- Separate from the emergency fund. Savings represent money set aside for non-emergency future use.
- Funded by its own percentage allocation.
- The user can define savings goals (optional) with target amounts and timelines.

### 5.8 Project Funding

- The user creates **projects** with a name, target amount, and optional deadline.
- Multiple projects can be active simultaneously.
- The project allocation percentage is split across active projects based on **user-defined priority ranking** (drag to reorder).
- Each project shows: amount funded so far, remaining amount, estimated completion date based on current allocation rate.
- When an emergency or unexpected expense disrupts funding, the app **recalculates timelines and alerts the user with options:**
  - Redistribute from another bucket temporarily.
  - Accept the delay.
  - Adjust project priority.

### 5.9 People Ledger (Debt Tracking)

Tracks informal lending in both directions:

- **Money you lent:** who, how much, when, optional due date.
- **Money you owe:** who, how much, when, optional due date.
- **Reminders:** if a due date is set, the app reminds you (e.g., _"X owes you 15,000 FCFA — due date was 3 days ago"_).
- Money owed to you is NOT counted as available income until it's actually received and logged.
- Money you owe is factored into your expense obligations.

### 5.10 Month-Over-Month Comparison

- At the end of each month (and accessible anytime), the app shows a comparison between the current month and the previous month.
- **Visual charts:**
  - **Bar charts** comparing category spending month over month.
  - **Pie charts** showing category breakdown for the current month.
- Highlights categories where spending increased or decreased.
- Flags areas where optimization is possible based on trends (e.g., _"Food spending has increased 18% over the last 2 months"_).

### 5.11 Reports

**Weekly report:**

- Total spent this week vs. weekly average.
- Top spending categories.
- Days with highest spending.
- Quick pulse check — are you on track for the month?

**Monthly report:**

- Full income vs. expenses breakdown.
- Allocation performance: did each bucket receive what it was supposed to?
- Category and subcategory breakdown with charts.
- Emergency fund and savings progress.
- Project funding progress.
- People ledger summary (outstanding debts in/out).
- Month-over-month comparison.
- Optimization suggestions based on spending patterns.

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

### 6.1 Main Navigation (Bottom Tab Bar)

1. **Dashboard** — overview of current month: remaining budget, allocation progress bars, emergency fund status, quick-add button.
2. **Transactions** — chronological list of all logged expenses and income. Filterable by category, date range, and source.
3. **Budget** — category budgets with progress bars. Allocation settings. Edit percentages.
4. **Projects** — list of active projects with funding progress. People ledger access.
5. **Reports** — weekly and monthly reports. Charts and comparisons.

### 6.2 Key Screens

- **Income Allocation Screen:** appears when new income is logged. Shows how the money will be distributed across buckets. User confirms or adjusts.
- **Quick-Add Screen:** grid of frequent expenses. One-tap logging.
- **Category Management:** add, edit, delete categories and subcategories.
- **Project Detail:** funding progress, timeline, priority adjustment.
- **People Ledger:** list of debts in/out with status and reminders.
- **Settings:** PIN setup, allocation percentages, notification preferences, data backup, category management.

---

## 7. Security

- **PIN protection** on app launch.
- All financial data stored locally on-device as the primary source of truth.
- **Cloud backup via Supabase** for data recovery in case of phone loss.
- Supabase auth for securing the cloud layer.

---

## 8. Tech Stack

| Layer         | Technology                                                                  |
| ------------- | --------------------------------------------------------------------------- |
| Mobile App    | React Native (Expo)                                                         |
| Local Storage | SQLite or AsyncStorage (structured financial data favors SQLite)            |
| Cloud Backend | Supabase (auth, database backup, sync)                                      |
| Charts        | React Native chart library (e.g., react-native-chart-kit or Victory Native) |
| Notifications | Expo Notifications (local scheduled notifications)                          |

---

## 9. Data Model (High Level)

### Entities

- **User:** PIN, preferences, allocation percentages, current mode (learning/control).
- **Income:** amount, source (salary/freelance/e-commerce), date, tagged.
- **Expense:** amount, category, subcategory, note, date, is_recurring, recurring_schedule.
- **Category:** name, type (default/custom), parent (null for top-level).
- **Subcategory:** name, parent_category_id.
- **Allocation:** month, emergency*fund*%, savings*%, projects*%, expenses\_%.
- **Emergency Fund:** target_amount, current_amount.
- **Savings:** target_amount (optional), current_amount.
- **Project:** name, target_amount, funded_amount, priority_rank, deadline (optional), status (active/completed/paused).
- **Debt:** person_name, amount, direction (lent/owed), date, due_date, status (pending/settled).
- **Quick Add Template:** label, amount, category, subcategory.
- **Recurring Expense:** expense_template, frequency, next_due_date.

---

## 10. Development Phases

### Phase 1 — Foundation

- App scaffold with Expo.
- PIN authentication.
- Local database setup (SQLite).
- Income logging with source tagging.
- Expense logging (manual entry).
- Category and subcategory management (defaults + custom).

### Phase 2 — Daily Habits

- Quick-add templates.
- Recurring expenses (auto-log with edit/skip).
- Daily reminder notifications.
- Zero-day confirmation flow.
- Transaction list with filters.

### Phase 3 — Allocation & Budgeting

- Allocation system (percentage-based, priority-ordered).
- Income allocation screen.
- Monthly budget by category.
- Over-budget alerts on expense entry.
- Emergency fund tracking with target and auto-redistribution.
- Savings tracking.

### Phase 4 — Projects & Debt

- Project creation with target amount and deadline.
- Priority-ranked project funding.
- Timeline estimation and recalculation alerts.
- People ledger (lent/owed) with due dates and reminders.

### Phase 5 — Insights & Reports

- Monthly report generation.
- Weekly report generation.
- Bar charts and pie charts for category breakdown.
- Month-over-month comparison with trend detection.
- Optimization suggestions.

### Phase 6 — Cloud & Sync

- Supabase integration (auth + database).
- Cloud backup of all local data.
- Sync mechanism (local-first, cloud as backup).
- Data recovery flow for new device setup.

---

## 11. Success Metrics (Personal)

Since this is built for personal use, success is measured by:

- **Logging consistency:** did I log every day for 30 days straight?
- **Budget adherence:** did my actual spending stay within allocated expense budgets?
- **Fund growth:** are emergency fund, savings, and project funds growing monthly?
- **Expense reduction:** is month-over-month spending trending down?
- **Project completion:** did I fully fund and launch at least one project within the estimated timeline?

---

## 12. Future Considerations (Post-Complete Product)

These are explicitly out of scope for the current build but noted for potential public release:

- Multi-currency support.
- Shared household budgeting.
- Bank/mobile money integration (API-based auto-import).
- Export to CSV/PDF.
- Financial coaching / AI-powered suggestions.
- Public release with onboarding flow, user accounts, and freemium model.
