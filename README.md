# Pesa Plan

Pesa Plan is a private, offline-first personal finance app for tracking accounts,
cash flow, budgets, savings, debt, and net worth.

## Current milestone

Version 1.0 is released as a signed Android artifact. Version 1.1 is the current
quality release and includes:

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
- a Home privacy control that masks every visible financial amount;
- automatic biometric prompting when the lock screen opens;
- dedicated savings accounts with account-backed goal allocations;
- 29 practical income and expense categories;
- dashboard, transaction, plan, debt, and report navigation.

See [ROADMAP.md](./ROADMAP.md) for the durable delivery plan and status.

## Run locally

Install the Android development build once on a connected device:

```bash
npm install
npm run android
```

After that, start Metro for the installed Pesa Plan development build:

```bash
npm start
```

Then press `a` for Android. The SDK 57 app uses a dedicated development build,
not Expo Go. Press `w` for the configured web preview; the app remains
mobile-first and Expo SQLite's web support is alpha.

## Quality checks

```bash
npm run typecheck
npm run check
npm run release:check
```

`release:check` runs strict TypeScript validation, the unit and SQLite
integration suites, Expo Doctor, and production Android and web exports.
The same gate runs in GitHub Actions for pushes and pull requests.

## Architecture

- `src/app`: file-based screens and navigation
- `src/components`: reusable interface components
- `src/data`: SQLite migrations and repositories
- `src/domain`: types and financial calculations
- `src/providers`: application data state
- `src/theme`: colors, spacing, and typography

All monetary values are stored as integer minor units. For example, KES 10.50 is
stored as `1050`, avoiding floating-point rounding errors.
