# Pesa Plan 1.1.0

Pesa Plan 1.1 is a focused quality release completed before Version 2 work
begins.

## Improvements

- Home greets the user with good morning, afternoon, or evening based on the
  device's local time.
- A single eye control on Home hides or reveals the main balance, monthly
  income, spending, savings rate, account-card balances, and recent-activity
  amounts.
- Hidden amounts are also removed from Home accessibility descriptions.
- The lock screen starts strong biometric authentication automatically and
  keeps the PIN available as a fallback.
- Savings is now a dedicated account type.
- Savings goals link to a real KES savings account.
- Goal contributions allocate existing savings instead of creating fictional
  money, income, expenses, or transfers.
- Allocations cannot exceed either the goal target or the linked account's
  unallocated balance.
- The goals screen shows actual, allocated, and available savings for each
  savings account.
- Existing Version 1 goals are preserved and can be linked to a savings account
  after migration.
- Default categorization expands from 12 to 29 income and expense categories.

## Data model

- Database schema version 9 adds the `savings` account type and optional
  account links for migrated savings goals.
- Existing accounts, transactions, transfers, budgets, funds, goals, debts,
  reports, and backups remain compatible.

## Android artifact

- EAS build: `137d4f91-51eb-4ef5-8dea-1ac7598a1b12`
- Package: `com.jimkar.pesaplan`
- Version name: `1.1.0`
- Version code: `5`
- SHA-256:
  `0463382211fea75f62b720e57d08c3b93433c93460f07367f1088f0db593a279`
- Signed with the same release certificate as Version 1.0 so it can be
  installed as an in-place update.
