# Release checklist

## Automated gates

- [x] `npm ci`
- [x] `npm run release:check`
- [x] All migration, encryption, CSV, and money-calculation tests pass
- [x] Expo Doctor reports 20/20 checks
- [x] Android production bundle completes

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

## Finance and data integrity

- [ ] Fresh install creates the starter account and 12 categories
- [ ] Upgrade an existing version-1 database through version 7
- [ ] Income, expense, edit, delete, transfer, and recurring posting recalculate balances
- [ ] KES reports exclude accounts in other currencies
- [ ] Backup decrypts with the correct password and rejects a wrong password
- [ ] Restore replaces all supported tables and the restored app restarts cleanly

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
