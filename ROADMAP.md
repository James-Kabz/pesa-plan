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

Status: **Complete**

- [x] Guided, skippable, and resumable first-time setup
- [x] Main currency selection with three-letter custom codes
- [x] Cash, bank, mobile-money, and savings account setup
- [x] Opening balances that are never counted as income
- [x] Expected monthly income kept separate from received transactions
- [x] Receiving account, pay day, and fixed/variable income details
- [x] Basic current-month category budget with live unassigned amount
- [x] Named custom expense categories when “Other” is selected for a budget
- [x] Savings explained and modeled as an account transfer/allocation, not an expense
- [x] Setup review and safe rerun from Settings without duplicate planning records
- [x] Version 1.1 backup compatibility and no forced setup for existing users
- [x] Physical-device setup, migration, accessibility, and small-screen verification

### Stage 8 — Helpful Home and faster entry

Status: **Complete**

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
- [x] Global transaction search with useful filters
- [x] Multi-word matching across descriptions, categories, accounts, types, currencies, and amounts
- [x] Account, category, date, amount, type, and sort filters with clear reset states

### Stage 9 — Local planning assistance

Status: **Complete**

- [x] Confirmed recurring-pattern suggestions without automatic posting
- [x] Strict weekly and monthly detection with amount-stability and duplicate safeguards
- [x] Explainable on-device evidence, future due-date calculation, and explicit approval
- [x] Confirmed schedule deletion with a choice to keep or remove linked posted transactions
- [x] Opt-in local schedule and pay-day reminders with no automatic posting
- [x] One low-noise weekly budget and savings-goal check-in
- [x] Independent reminder controls, private lock-screen copy, and a test action
- [x] Budget Compass based on money remaining instead of artificial daily allowances
- [x] Personalized category guidance based on real recent transaction sizes
- [x] Privacy-aware Home pulse plus detailed, accessible Plan guidance
- [x] Savings guidance based on real account balances and goal allocations
- [x] Emergency-first, currency-safe allocation and funding recommendations
- [x] Shortfall detection, preselected accounts, and explicit confirmation flows
- [x] Clear debt-payment guidance using the chosen payoff strategy
- [x] Month-aware minimum tracking, due-day priority, and affordable extra-payment guidance
- [x] Negative-amortization warnings, remembered strategy, and confirmed payment recording

### Stage 10 — Monthly review and Version 2 release

Status: **Complete**

- [x] Plain-language monthly review: income, spending, savings, debt, and changes
- [x] Deterministic insights that explain the numbers behind every suggestion
- [x] Empty-state, accessibility, font-scaling, and error-message polish
  - consistent 48-point navigation and modal controls
  - semantic headings, progress values, selected states, and delete actions
  - direct next actions on empty Activity, savings, funds, and debt screens
  - flexible high-use forms, cards, and amount layouts for larger text
  - modal focus and spoken save confirmation for assistive technology
- [x] Migration, backup/restore, clean-install, and upgrade release gates
- [x] Signed Android Version 2 build and physical-device checklist

Release verification completed fresh installation, the signed Version 1.1
upgrade, encrypted backup and restore, PIN, fingerprint, and inactivity
locking, notification permissions and reminders, offline use, background
locking, small-screen coverage, signed Android APK/AAB validation, and final
feature regression.

## Product principles

1. Offline-first and useful without an account.
2. Financial calculations must be deterministic and tested.
3. Money uses integer minor units, never floating-point storage.
4. Users own their data and can export or delete it.
5. New scope is added only after the current stage is dependable.
6. Smart features explain their reasoning and never move or record money automatically.
