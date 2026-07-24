# Pesa Plan 1.1.0

Pesa Plan 1.1 is a focused quality release completed before Version 2 work
begins.

## Improvements

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
