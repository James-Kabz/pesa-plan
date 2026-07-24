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

Status: **Not started**

- [ ] Spending trends and category comparisons
- [ ] Net-worth history
- [ ] Cash-flow forecast
- [ ] Savings rate and debt-to-income reporting

## Stage 5 — Privacy, backup, and portability

Status: **Not started**

- [ ] PIN and biometric lock
- [ ] App-switcher privacy
- [ ] Automatic inactivity lock
- [ ] CSV export
- [ ] Encrypted local backup and restore
- [ ] Optional encrypted cloud synchronization

## Stage 6 — Testing and release

Status: **Not started**

- [ ] Unit tests for all money calculations
- [ ] Database migration tests
- [ ] Accessibility and device-size testing
- [ ] Android internal testing
- [ ] iOS TestFlight
- [ ] Store privacy disclosures and release

## Product principles

1. Offline-first and useful without an account.
2. Financial calculations must be deterministic and tested.
3. Money uses integer minor units, never floating-point storage.
4. Users own their data and can export or delete it.
5. New scope is added only after the current stage is dependable.
