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
- [ ] First hosted GitHub Actions run passes after a remote is connected

## Manual device matrix

- [ ] Small Android phone: 360 × 640 logical pixels
- [ ] Standard Android phone
- [ ] iPhone SE-sized simulator/device
- [ ] Current large iPhone
- [ ] Tablet layout has no clipped controls
- [ ] 200% font scaling preserves every form action
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
- [ ] Restored app restarts cleanly on a physical device

## Security

- [ ] PIN setup, incorrect PIN, correct PIN, and removal
- [ ] Strong biometric success, cancellation, and unavailable-device fallback
- [ ] App locks after two minutes without interaction
- [ ] Background/recent-app view does not expose financial data

## Distribution

- [ ] Confirm `com.jimkar.pesaplan` identifiers are available
- [ ] Configure the EAS project and signing credentials
- [ ] Build the `preview` profile and complete Android internal testing
- [ ] Build the `production` profile
- [ ] Complete Play Console data-safety disclosure from `PRIVACY.md`
- [ ] Complete Apple App Privacy disclosure from `PRIVACY.md`
- [ ] Upload to TestFlight and complete external beta review
- [ ] Publish only after beta feedback has no unresolved financial-integrity issue
