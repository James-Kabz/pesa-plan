# Pesa Plan

Pesa Plan is a private, offline-first personal finance app for tracking accounts,
cash flow, budgets, savings, debt, and net worth.

## Current milestone

Stage 1 is in progress. The app currently includes:

- an Expo + React Native + TypeScript foundation;
- a persistent SQLite database with migrations;
- accounts and seeded transaction categories;
- account creation and editing;
- income and expense creation, editing, filtering, and deletion;
- same-currency transfers that remain neutral in cash-flow reports;
- current-month cash-flow calculations;
- editable monthly category budgets with actual-spending progress;
- recurring bill due states and manual posting;
- sinking funds with contribution progress;
- savings goals and emergency-fund coverage;
- debt balances, payment history, payoff estimates, and snowball/avalanche priorities;
- category and monthly trends, net-worth snapshots, and 30-day cash-flow forecasting;
- secure PIN/biometric locking, background privacy, and inactivity locking;
- CSV export and password-encrypted full backup/restore;
- dashboard, transaction, plan, debt, and report navigation.

See [ROADMAP.md](./ROADMAP.md) for the durable delivery plan and status.

## Run locally

```bash
npm install
npm start
```

Then press `a` for Android or `i` for iOS. The app is mobile-first; Expo SQLite's
web support is currently alpha.

## Quality checks

```bash
npm run typecheck
npm run check
```

## Architecture

- `src/app`: file-based screens and navigation
- `src/components`: reusable interface components
- `src/data`: SQLite migrations and repositories
- `src/domain`: types and financial calculations
- `src/providers`: application data state
- `src/theme`: colors, spacing, and typography

All monetary values are stored as integer minor units. For example, KES 10.50 is
stored as `1050`, avoiding floating-point rounding errors.
