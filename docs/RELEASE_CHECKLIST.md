# Release checklist

## Automated gates

- [x] `npm ci`
- [x] `npm run release:check`
- [x] All migration, encryption, CSV, and money-calculation tests pass
- [x] Expo Doctor reports 20/20 checks
- [x] Android production bundle completes
- [x] Web production bundle completes with SQLite worker headers
- [x] Android native prebuild applies the branded icon and disables OS cloud backup
- [x] GitHub Actions workflow is configured to repeat the locked-install release gate
- [x] First hosted GitHub Actions run passes after a remote is connected

## Manual device matrix

- [x] Small Android phone: 360 × 640 logical pixels
- [x] Standard Android phone
- [ ] iPhone SE-sized simulator/device
- [ ] Current large iPhone
- [ ] Tablet layout has no clipped controls
- [x] 200% font scaling preserves every primary navigation action
- [ ] TalkBack labels icon-only actions and form controls
- [ ] VoiceOver labels icon-only actions and form controls
- [ ] Light and dark system settings remain readable

## Browser responsive smoke

- [x] 360 × 640 viewport has no horizontal overflow or clipped controls
- [x] 390 × 844 viewport has no horizontal overflow or clipped controls
- [x] 768 × 1024 viewport has no horizontal overflow or clipped controls
- [x] Tabs, actions, filters, and form controls expose explicit accessibility semantics

## Finance and data integrity

- [x] Automated fresh-database test creates the starter account and 12 categories
- [x] Automated populated version-1 fixture upgrades through version 7 without data loss
- [x] Automated interrupted initial migration recovers without losing existing rows
- [ ] Repeat the version-1 upgrade on a physical device
- [x] Integration tests cover income, expense, edit, delete, transfer, and recurring balances
- [x] Integration tests prove KES reports exclude accounts in other currencies
- [x] Backup decrypts with the correct password and rejects a wrong password
- [x] Integration test replaces all supported tables and rolls back invalid restore rows
- [x] Restored app restarts cleanly on a physical device

## Security

- [x] PIN setup, incorrect PIN, correct PIN, and removal
- [ ] Strong biometric success, cancellation, and unavailable-device fallback
- [x] App locks after two minutes without interaction
- [x] Background/recent-app view does not expose financial data

## Distribution

- [ ] Confirm `com.jimkar.pesaplan` identifiers are available
- [x] Configure the EAS project and signing credentials
- [x] Build the `preview` profile and complete Android internal testing
- [x] Build the `production` profile
- [ ] Complete Play Console data-safety disclosure from `PRIVACY.md`
- [ ] Complete Apple App Privacy disclosure from `PRIVACY.md`
- [ ] Upload to TestFlight and complete external beta review
- [ ] Publish only after beta feedback has no unresolved financial-integrity issue

## Android verification record — 24 July 2026

Device: Samsung Galaxy A55 (`SM-A556E`), Android 16.

- The Home, Activity, Plan, Debt, and Reports tabs rendered and remained
  reachable at the device's normal 1080 × 2340 configuration.
- The same five tabs remained reachable at a simulated 360 × 640 logical
  viewport with 130% font scaling.
- Primary navigation and dashboard actions remained exposed to Android's
  accessibility tree at 200% font scaling.
- Cold start, foreground/background transitions, persistent SQLite data,
  PIN setup, wrong-PIN rejection, correct-PIN unlock, PIN removal, and the
  two-minute inactivity lock completed without a native crash.
- Android screen capture returned a protected blank app surface, confirming
  that financial content was not exposed.
- A password-encrypted `.ppbackup` file was generated and handed to Android's
  native share sheet.
- EAS preview build `29371874-7e82-4678-8b37-0edd382a72d0` produced a signed
  Version 1.0.0 APK with package ID `com.jimkar.pesaplan` and version code 2.
- The final preview manifest excludes the unnecessary Android overlay
  permission, and the hardened build passed the same signed-device checks.
- The signed APK launched without Metro or network connectivity, restored the
  encrypted device backup, retained the Ksh 47,700 Salary ledger after a cold
  restart, and emitted no fatal or React Native JavaScript errors.
- Screen capture from the signed APK exposed no financial data.
- EAS production build `e49f8e87-0570-42bc-a442-f962f90df97a` produced the
  signed Version 1.0.0 Android App Bundle with version code 3. Its SHA-256 is
  `710a04f1a2aa8ad7a809acd9d2a99c5ba9182face2640b68646f6fb36c088fe3`.
- The original display size, 420 dpi override, 90% font scale, app data, and
  no-PIN state were restored after testing.

## Android Version 1.1 artifact — 24 July 2026

- [x] Version 1.1 clean-install CI release gate passes
- [x] Signed standalone APK produced with package `com.jimkar.pesaplan`
- [x] APK reports version name 1.1.0 and version code 5
- [x] APK signature matches the tested Version 1.0 release certificate
- [x] APK archive integrity and permission manifest verified
- [ ] Install as an in-place update and validate the Version 7-to-9 database migration on the physical device
