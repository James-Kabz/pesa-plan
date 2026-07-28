# Pesa Plan 2.0.0 release verification

Verification date: 28 July 2026

## Automated release gates

- [x] `npm run release:check`
- [x] TypeScript type checking
- [x] 92 tests across 15 test files
- [x] Migration, repository, encrypted backup, restore, reminders, and money-domain tests
- [x] Expo Doctor reports 20/20 checks
- [x] Android production JavaScript export
- [x] Web production export
- [x] Native Gradle release APK and AAB assembly

## Signed EAS artifacts

### Internal-testing APK

- Build ID: `8bf27fcc-7736-4a8d-9a1a-2c953b0cf889`
- Package: `com.jimkar.pesaplan`
- Version: `2.0.0` (`versionCode` 8)
- SHA-256:
  `34e2455f678d3807aba927f1bad1d6216c79c0666f4c45353abfd4507818124d`
- Signing-certificate SHA-256:
  `581d8277d3810a7b64869e4216b36e764b831f01ef02b6bacf2657589f63a379`
- [x] APK archive and Android v2 signature verified
- [x] Signature matches the Version 1.1 release certificate
- [x] Standalone cold launch succeeds without Metro

### Google Play production AAB

- Build ID: `0af07251-8d59-4771-a7c6-1f216a314bfe`
- Package: `com.jimkar.pesaplan`
- Version: `2.0.0` (`versionCode` 9)
- SHA-256:
  `df886b0eade30351fff666e99c19cac2adecea8afebd14e00e4343b47d6525d6`
- Signing-certificate SHA-256:
  `581d8277d3810a7b64869e4216b36e764b831f01ef02b6bacf2657589f63a379`
- [x] AAB archive integrity verified
- [x] JAR signature verified
- [x] EAS production build completed successfully

Both final artifacts were built from commit
`a1b09c6fd12d830e217730189463bedf86bb7316`.

The locally assembled APK and AAB use the Android debug certificate and are
test artifacts only. The EAS production AAB above is the release-signed
Google Play artifact.

## Installation and migration

- [x] Clean Version 2 installation opens the six-step guided setup
- [x] Setup remains skippable and its primary actions are reachable
- [x] A signed Version 1.1.0 (`versionCode` 5) installation upgrades in place
  to signed Version 2.0.0 (`versionCode` 6)
- [x] Android retains the original install time during the upgrade
- [x] Existing users are not forced through first-time setup
- [x] The prepared `MigrationTest` income transaction and Ksh 123.45 balance
  remain visible after migration
- [x] No fatal Android or React Native errors appear after the upgrade

## Data ownership and restore

- [x] A password-encrypted `.ppbackup` is created and handed to Android's
  native share flow
- [x] Automated integration tests decrypt, validate, replace all supported
  tables, reject invalid data, and roll back failed restores
- [x] Complete a file-picker restore on the Samsung device and confirm the
  restored Salary transaction survives a cold restart

The Android TV emulator's system image exposes a stub instead of a document
picker, so the real file-selection interaction was completed on the Samsung
device. The first attempt also confirmed that an incorrect password is
rejected without replacing the ledger.

## Security and lifecycle

- [x] PIN setup
- [x] Incorrect PIN rejection
- [x] Correct PIN unlock
- [x] Immediate background/reopen lock
- [x] Two-minute inactivity lock
- [x] Screen-capture protection
- [x] Strong fingerprint success, cancellation, and PIN fallback on the
  Samsung device

The first device run exposed a lifecycle race that relocked the app after a
successful fingerprint. Commit `a1b09c6` limits locking to true background
transitions while retaining the privacy cover for every non-active state. The
fixed local release build and final EAS-signed APK both stayed unlocked after
successful strong fingerprint authentication. The temporary test PIN was
removed afterward.

## Reminders, offline use, and device coverage

- [x] Notification permission can be granted
- [x] Schedule, payday, and weekly check-in controls operate independently
- [x] Test reminder is delivered after approximately five seconds
- [x] Notification title and body do not contain balances or transaction
  amounts
- [x] Cold launch and navigation work with Wi-Fi disabled
- [x] Today, Activity, Plan, Debt, and Reports render without Metro
- [x] A 720 × 1280 logical display at 130% font scale keeps setup actions,
  tabs, empty-state actions, and report cards reachable
- [x] Complete the final Samsung fingerprint-success check

## Final regression

- [x] Automated coverage passes for transactions, transfers, budgets, savings,
  debt, recurring schedules, reminders, search, backup, and monthly review
- [x] Signed migration fixture remains searchable and visible in Activity
- [x] Repeat the restored-data smoke test on the Samsung device

The restored ledger retained three accounts, five monthly budgets, one debt,
and the Ksh 47,700 Salary transaction. After a force-stop and cold launch,
Home showed Ksh 70,300 total and Activity exposed the Salary record without
fatal Android or React Native errors.
