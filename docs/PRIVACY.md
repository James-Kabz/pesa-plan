# Pesa Plan privacy disclosure

Last updated: 24 July 2026

Pesa Plan is offline-first. It does not require an account, contain advertising
SDKs, or automatically send financial records to a developer-controlled server.
Android operating-system cloud backup is disabled for the app, so its local
database is not silently copied to Google Drive.

## Data stored on the device

- accounts, transactions, transfers, budgets, bills, goals, debts, and reports;
- the hashed app-lock PIN, stored through the operating system's secure storage;
- monthly net-worth snapshots derived from local records.

The app never stores the user's raw PIN. Biometric templates remain with the
operating system and are never accessible to Pesa Plan.

## User-controlled exports

The user can explicitly:

- share transaction data as CSV;
- create a full backup encrypted with a user-provided password;
- restore a selected encrypted backup.

Exported files leave the app only through the operating system share or document
picker selected by the user. Pesa Plan does not automatically upload them.

## Device permissions and capabilities

- Biometrics: optional local app unlock.
- File/document access: only when exporting or selecting a backup.
- Screen-capture protection: prevents financial screens from appearing in
  screenshots, recordings, or recent-app previews where supported.

## Store disclosure summary

For the current offline build, no user data is collected by the developer and no
data is used for tracking. Before adding analytics, crash reporting, bank
connections, or cloud sync, this document and both store disclosures must be
reassessed.
