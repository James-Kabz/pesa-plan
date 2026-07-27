# Product roadmap

This file is the source of truth for delivery status. Update it whenever a
milestone changes.

## Stage 1 — Foundation, accounts, and transactions

Status: **Complete**

- [x] Initialize Expo, React Native, and TypeScript
- [x] Configure Expo Router
- [x] Add SQLite persistence and migrations
- [x] Define accounts, categories, and transactions
- [x] Seed default categories and a starter cash account
- [x] Add income and expense entry
- [x] Calculate account balances and monthly cash flow
- [x] Add account creation and editing
- [x] Add transaction editing, deletion, search, and filters
- [x] Add transfers between same-currency accounts
- [x] Add recurring transactions with deliberate manual posting

## Stage 2 — Budgets and bills

Status: **Complete**

- [x] Monthly category budgets
- [x] Budget-versus-actual progress
- [x] Recurring bill schedule and in-app due reminders
- [x] Sinking funds and contributions

## Stage 3 — Savings and debt

Status: **Complete**

- [x] Savings goals and contributions
- [x] Debt accounts and payment history
- [x] Snowball and avalanche priorities with payoff estimates
- [x] Emergency-fund coverage estimate

## Stage 4 — Reports and forecasting

Status: **Complete**

- [x] Spending trends and category comparisons
- [x] Monthly net-worth snapshots and history
- [x] 30-day scheduled cash-flow forecast
- [x] Savings rate and debt-to-income reporting

## Stage 5 — Privacy, backup, and portability

Status: **Complete**

- [x] Secure PIN and strong-biometric lock
- [x] App-switcher and screen-capture privacy
- [x] Two-minute inactivity lock
- [x] CSV transaction export
- [x] Password-encrypted local backup and validated restore
- [x] Cloud boundary documented; automatic upload remains disabled

## Stage 6 — Testing and release

Status: **Android Version 1.1 complete; store publication and iOS remain pending**

- [x] Unit tests for money, backup, and export calculations
- [x] Executable database migration and integrity tests
- [x] Reproducible clean-install CI release gate
- [x] Browser responsive and accessibility-semantics smoke testing
- [x] Physical-device accessibility semantics, font-scaling, and device-size testing
- [x] Android internal testing
- [ ] iOS TestFlight
- [x] Store privacy disclosure draft and EAS release configuration
- [ ] Store submissions and production release

## Version 2 — Smart and simple

Version 2 is focused on making the app more helpful without turning it into a
complex accounting product. Guidance remains private, offline, deterministic,
and under the user's control.

### Stage 7 — First-time experience and user control

Status: **Implementation complete; device verification pending**

- [x] Guided, skippable, and resumable first-time setup
- [x] Main currency selection with three-letter custom codes
- [x] Cash, bank, mobile-money, and savings account setup
- [x] Opening balances that are never counted as income
- [x] Expected monthly income kept separate from received transactions
- [x] Receiving account, pay day, and fixed/variable income details
- [x] Basic current-month category budget with live unassigned amount
- [x] Savings explained and modeled as an account transfer/allocation, not an expense
- [x] Setup review and safe rerun from Settings without duplicate planning records
- [x] Version 1.1 backup compatibility and no forced setup for existing users
- [ ] Physical-device setup, migration, accessibility, and small-screen verification

### Stage 8 — Helpful Home and faster entry

Status: **Started**

- [x] Expected-versus-recorded monthly income card
- [x] Full Today screen with a focused, explainable next action
- [x] Deterministic priority for overdue schedules, due-soon items, and budget issues
- [x] At-a-glance upcoming schedule and monthly budget pulse
- [x] Upcoming schedule review with explicit confirmation before posting
- [x] Highest-use budget watch and main-currency-safe summaries
- [x] Privacy masking across all Today monetary values
- [x] Faster transaction entry using recent accounts, categories, and amounts
- [x] One-tap reusable templates from recent confirmed transactions
- [x] Save-and-add-another flow that preserves useful choices
- [x] Local category suggestions learned from confirmed transaction descriptions
- [x] Explainable exact and similar-description matching that avoids ambiguous guesses
- [x] Explicit suggestion acceptance and dismissal with no automatic category changes
- [ ] Global transaction search with useful filters

### Stage 9 — Local planning assistance

Status: **Planned**

- [ ] Confirmed recurring-pattern suggestions without automatic posting
- [ ] Local bill, pay-day, budget, and goal reminders
- [ ] Budget pacing based on time remaining in the month
- [ ] Savings guidance based on real unallocated account balances
- [ ] Clear debt-payment guidance using the chosen payoff strategy

### Stage 10 — Monthly review and Version 2 release

Status: **Planned**

- [ ] Plain-language monthly review: income, spending, savings, debt, and changes
- [ ] Deterministic insights that explain the numbers behind every suggestion
- [ ] Empty-state, accessibility, font-scaling, and error-message polish
- [ ] Migration, backup/restore, clean-install, and upgrade release gates
- [ ] Signed Android Version 2 build and physical-device checklist

## Product principles

1. Offline-first and useful without an account.
2. Financial calculations must be deterministic and tested.
3. Money uses integer minor units, never floating-point storage.
4. Users own their data and can export or delete it.
5. New scope is added only after the current stage is dependable.
6. Smart features explain their reasoning and never move or record money automatically.
