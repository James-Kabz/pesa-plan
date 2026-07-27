# Pesa Plan

Pesa Plan is a private, offline-first personal finance app for tracking accounts,
cash flow, budgets, savings, debt, and net worth.

## Current milestone

Version 1.1 is the current signed and device-verified Android release. Version
2.0 is now in development, beginning with a guided, offline setup for main
currency, real accounts and opening balances, expected monthly income, and a
basic budget. Its Smart Today screen adds one explainable next action, upcoming
schedules, budget pacing, and expected-versus-recorded income without posting
anything automatically. Faster entry adds recent templates, recent amounts,
last-used account/category defaults, and a save-and-add-another workflow. Smart
categorization privately learns from confirmed descriptions, explains strong
matches, and waits for the user to accept every suggestion. Recurring assistance
detects strong weekly or monthly patterns on-device and proposes reminder
schedules without automatically recording transactions. Opt-in local
notifications add private schedule, payday, and combined weekly budget/savings
check-ins; notification previews never expose financial amounts. Budget pacing
turns each remaining category balance into an explainable daily guide, highlights
fast or exhausted categories, and projects month-end spending from confirmed
activity. Savings guidance compares real savings-account balances with goal
allocations, recommends an emergency-first next step, and never moves or assigns
money without confirmation. Debt guidance remembers the chosen avalanche or
snowball strategy, accounts for payments already recorded this month, covers
remaining minimums before recommending extra payments, and flags minimums that
cannot beat monthly interest. The monthly review turns confirmed local records
into a plain-language story covering cash flow, real savings, debt progress,
net worth, largest spending, and exact changes from the previous month.
Global Activity search matches multiple words across descriptions, categories,
accounts, types, currencies, and amounts, with local filters for account,
category, date, amount, type, and sort order.
Version 1.1 includes:

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

Then press `a` for Android. The default start command uses the USB-forwarded
localhost connection, so it does not depend on the phone and computer sharing a
working Wi-Fi network. The SDK 57 app uses a dedicated development build, not
Expo Go. Press `w` for the configured web preview; the app remains mobile-first
and Expo SQLite's web support is alpha.

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
