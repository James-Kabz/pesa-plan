# Pesa Plan 1.0.0

Pesa Plan 1.0 is the first release of the private, offline-first personal
finance app.

## Highlights

- Track cash, bank, savings, debt, and other accounts.
- Record income, expenses, transfers, and recurring transactions.
- Compare monthly category budgets with actual spending.
- Plan bills, sinking funds, savings goals, and an emergency fund.
- Track debts with snowball and avalanche payoff estimates.
- Review cash flow, spending trends, savings rate, debt-to-income, net worth,
  and a 30-day forecast.
- Protect local data with PIN, biometrics, inactivity locking, and
  screen-capture privacy.
- Export transactions to CSV and create password-encrypted local backups.

## Data and privacy

Pesa Plan works without an account and stores financial records locally.
Automatic cloud sync, advertising, analytics, and developer-controlled data
collection are not included in Version 1.

## Validation

- 22 automated unit and database integration tests.
- 20/20 Expo Doctor checks.
- Production Android and web bundle exports.
- GitHub Actions clean-install release gate.
- Android 16 physical-device navigation, font scaling, small-display,
  privacy, backup, persistence, and PIN lifecycle checks.
- Signed Android internal build installed and tested without Metro or network
  connectivity.
- Password-encrypted backup restored successfully and persisted through a
  signed-app cold restart.
- Permission-hardened signed APK verified on a Samsung Galaxy A55.
- Signed production Android App Bundle generated as Version 1.0.0, version
  code 3, and validated as an intact release archive.
