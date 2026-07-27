import type { SQLiteDatabase } from 'expo-sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../test/sqlite';
import { migrateDatabase } from './migrations';
import {
  assignSavingsGoalAccount,
  contributeToFund,
  contributeToSavingsGoal,
  createDebt,
  createRecurring,
  createSavingsGoal,
  createSinkingFund,
  createTransaction,
  createTransfer,
  deleteRecurring,
  deleteTransaction,
  listAccounts,
  listBudgets,
  listCategories,
  listCategorySpending,
  listDebtPayments,
  listDebts,
  listMonthlyTrends,
  listRecurring,
  listSavingsGoals,
  listSinkingFunds,
  listTransactions,
  postRecurring,
  recordDebtPayment,
  saveAccount,
  saveBudget,
  saveCustomCategoryBudget,
  saveReminderPreference,
  saveDebtStrategy,
  completeOnboarding,
  getAppPreferences,
  listExpectedIncome,
} from './repository';

describe('finance repository integration', () => {
  let db: SQLiteDatabase;
  let closeDatabase: () => void;

  beforeEach(async () => {
    const testDatabase = await createTestDatabase();
    db = testDatabase.expo;
    closeDatabase = () => testDatabase.raw.close();
    await migrateDatabase(db);
  });

  afterEach(() => closeDatabase());

  it('recalculates balances after transaction edits, transfers, and deletes', async () => {
    const occurredAt = '2026-07-10T12:00:00.000Z';
    await createTransaction(db, {
      accountId: 'starter-cash',
      categoryId: 'salary',
      type: 'income',
      amountMinor: 100_000,
      occurredAt,
    });
    await createTransaction(db, {
      accountId: 'starter-cash',
      categoryId: 'food',
      type: 'expense',
      amountMinor: 25_000,
      occurredAt,
    });
    await saveAccount(db, {
      name: 'Main bank',
      type: 'bank',
      currency: 'KES',
      openingBalanceMinor: 10_000,
      color: '#3177A8',
    });

    const bank = (await listAccounts(db)).find((account) => account.name === 'Main bank');
    expect(bank).toBeDefined();
    await createTransfer(db, {
      fromAccountId: 'starter-cash',
      toAccountId: bank!.id,
      amountMinor: 20_000,
      occurredAt,
    });

    let activity = await listTransactions(db);
    const income = activity.find((transaction) => transaction.type === 'income');
    const expense = activity.find((transaction) => transaction.type === 'expense');
    const transfer = activity.find((transaction) => transaction.type === 'transfer');
    expect(income && expense && transfer).toBeTruthy();

    await createTransaction(db, {
      id: income!.id,
      accountId: 'starter-cash',
      categoryId: 'salary',
      type: 'income',
      amountMinor: 120_000,
      occurredAt,
    });

    let accounts = await listAccounts(db);
    expect(accounts.find((account) => account.id === 'starter-cash')?.currentBalanceMinor).toBe(
      75_000,
    );
    expect(accounts.find((account) => account.id === bank!.id)?.currentBalanceMinor).toBe(30_000);

    await deleteTransaction(db, transfer!.id);
    await deleteTransaction(db, expense!.id);
    accounts = await listAccounts(db);
    expect(accounts.find((account) => account.id === 'starter-cash')?.currentBalanceMinor).toBe(
      120_000,
    );
    expect(accounts.find((account) => account.id === bank!.id)?.currentBalanceMinor).toBe(10_000);
    activity = await listTransactions(db);
    expect(activity).toHaveLength(1);
  });

  it('rejects cross-currency transfers and excludes non-KES spending from reports', async () => {
    await saveAccount(db, {
      name: 'Dollar wallet',
      type: 'cash',
      currency: 'USD',
      openingBalanceMinor: 0,
      color: '#6558A5',
    });
    const dollarAccount = (await listAccounts(db)).find(
      (account) => account.currency === 'USD',
    );
    expect(dollarAccount).toBeDefined();

    await expect(
      createTransfer(db, {
        fromAccountId: 'starter-cash',
        toAccountId: dollarAccount!.id,
        amountMinor: 1_000,
        occurredAt: '2026-07-12T12:00:00.000Z',
      }),
    ).rejects.toThrow('same currency');

    await createTransaction(db, {
      accountId: 'starter-cash',
      categoryId: 'food',
      type: 'expense',
      amountMinor: 10_000,
      occurredAt: '2026-07-12T12:00:00.000Z',
    });
    await createTransaction(db, {
      accountId: dollarAccount!.id,
      categoryId: 'food',
      type: 'expense',
      amountMinor: 20_000,
      occurredAt: '2026-07-12T12:00:00.000Z',
    });
    await saveBudget(db, 'food', '2026-07', 50_000);

    expect((await listBudgets(db, '2026-07'))[0].spentMinor).toBe(10_000);
    expect((await listCategorySpending(db, '2026-07'))[0].amountMinor).toBe(10_000);
    expect((await listMonthlyTrends(db))[0]).toMatchObject({
      month: '2026-07',
      expenseMinor: 10_000,
    });
  });

  it('creates a named expense category with its budget and tracks only that spending', async () => {
    await expect(
      saveCustomCategoryBudget(db, ' ', '2026-07', 25_000),
    ).rejects.toThrow('at least two characters');

    const categoryId = await saveCustomCategoryBudget(
      db,
      '  Pet   care  ',
      '2026-07',
      25_000,
    );

    expect((await listCategories(db, 'expense')).find(({ id }) => id === categoryId)).toMatchObject({
      name: 'Pet care',
      type: 'expense',
      icon: 'ellipsis-horizontal',
    });

    await createTransaction(db, {
      accountId: 'starter-cash',
      categoryId,
      type: 'expense',
      amountMinor: 4_500,
      occurredAt: '2026-07-15T12:00:00.000Z',
    });

    expect((await listBudgets(db, '2026-07'))[0]).toMatchObject({
      categoryId,
      categoryName: 'Pet care',
      limitMinor: 25_000,
      spentMinor: 4_500,
    });
  });

  it('posts recurring entries and persists funds, goals, and clamped debt payments', async () => {
    await createRecurring(db, {
      accountId: 'starter-cash',
      categoryId: 'utilities',
      type: 'expense',
      amountMinor: 5_000,
      frequency: 'weekly',
      nextDueAt: '2026-07-24T12:00:00.000Z',
    });
    const schedule = (await listRecurring(db))[0];
    await postRecurring(db, schedule);
    const nextSchedule = (await listRecurring(db))[0];
    expect(nextSchedule.nextDueAt).toBe('2026-07-31T12:00:00.000Z');
    expect((await listAccounts(db))[0].currentBalanceMinor).toBe(-5_000);
    await deleteRecurring(db, schedule.id);
    expect(await listRecurring(db)).toHaveLength(0);
    expect(
      (await listTransactions(db)).filter((transaction) => transaction.type !== 'transfer'),
    ).toHaveLength(1);

    await createRecurring(db, {
      accountId: 'starter-cash',
      categoryId: 'subscriptions',
      type: 'expense',
      amountMinor: 2_000,
      note: 'Linked subscription',
      frequency: 'monthly',
      nextDueAt: '2026-08-01T12:00:00.000Z',
    });
    const linkedSchedule = (await listRecurring(db))[0];
    await postRecurring(db, linkedSchedule);
    expect(
      (await listTransactions(db)).filter((transaction) => transaction.type !== 'transfer'),
    ).toHaveLength(2);
    await expect(deleteRecurring(db, linkedSchedule.id, true)).resolves.toBe(1);
    expect(await listRecurring(db)).toHaveLength(0);
    expect(
      (await listTransactions(db)).filter((transaction) => transaction.type !== 'transfer'),
    ).toHaveLength(1);

    await createSinkingFund(db, {
      name: 'Insurance',
      targetMinor: 120_000,
      targetDate: '2026-12-01',
      color: '#D47B3A',
    });
    const fund = (await listSinkingFunds(db))[0];
    expect(fund).toMatchObject({ name: 'Insurance', targetDate: '2026-12-01' });
    await contributeToFund(db, fund.id, 10_000);
    expect((await listSinkingFunds(db))[0].savedMinor).toBe(10_000);

    await saveAccount(db, {
      name: 'Emergency savings',
      type: 'savings',
      currency: 'KES',
      openingBalanceMinor: 50_000,
      color: '#175C45',
    });
    const savingsAccount = (await listAccounts(db)).find(
      (account) => account.type === 'savings',
    );
    expect(savingsAccount).toBeDefined();
    await createSavingsGoal(db, {
      name: 'Emergency fund',
      targetMinor: 300_000,
      goalType: 'emergency',
      accountId: savingsAccount!.id,
      color: '#175C45',
    });
    const goal = (await listSavingsGoals(db))[0];
    await contributeToSavingsGoal(db, goal.id, 25_000);
    expect((await listSavingsGoals(db))[0]).toMatchObject({
      savedMinor: 25_000,
      accountId: savingsAccount!.id,
      accountName: 'Emergency savings',
      accountBalanceMinor: 50_000,
    });
    await expect(contributeToSavingsGoal(db, goal.id, 30_000)).rejects.toThrow(
      'unallocated money',
    );

    await createDebt(db, {
      name: 'Credit card',
      balanceMinor: 30_000,
      aprBasisPoints: 2400,
      minimumPaymentMinor: 3_000,
    });
    const debt = (await listDebts(db))[0];
    await recordDebtPayment(db, debt.id, 40_000, 'Final payment');
    expect(await listDebts(db)).toHaveLength(0);
    expect((await listDebtPayments(db, debt.id))[0]).toMatchObject({
      amountMinor: 30_000,
      note: 'Final payment',
    });
  });

  it('links migrated goals to real savings and protects allocated balances', async () => {
    await saveAccount(db, {
      name: 'Goal savings',
      type: 'savings',
      currency: 'KES',
      openingBalanceMinor: 40_000,
      color: '#3177A8',
    });
    const account = (await listAccounts(db)).find((item) => item.type === 'savings')!;
    await db.runAsync(
      `INSERT INTO savings_goals
        (id, name, target_minor, saved_minor, goal_type, target_date, color, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
      'legacy-goal',
      'Migrated goal',
      50_000,
      20_000,
      'general',
      '#3177A8',
      '2026-07-24T12:00:00.000Z',
    );

    await assignSavingsGoalAccount(db, 'legacy-goal', account.id);
    await contributeToSavingsGoal(db, 'legacy-goal', 20_000);
    expect((await listSavingsGoals(db))[0]).toMatchObject({
      savedMinor: 40_000,
      accountId: account.id,
    });
    await expect(contributeToSavingsGoal(db, 'legacy-goal', 1)).rejects.toThrow(
      'unallocated money',
    );
    await expect(
      saveAccount(db, {
        id: account.id,
        name: account.name,
        type: 'bank',
        currency: 'KES',
        openingBalanceMinor: account.openingBalanceMinor,
        color: account.color,
      }),
    ).rejects.toThrow('must remain a savings account');
  });

  it('completes guided setup without creating income or duplicate planning rows', async () => {
    const draft = {
      mainCurrency: 'USD',
      incomeName: 'Consulting',
      incomeAmount: '2500',
      incomeAccountId: 'starter-cash',
      incomePayDay: '28',
      incomeIsEstimate: true,
      budgetAmounts: { housing: '900', transport: '150' },
    };
    await db.runAsync(`UPDATE accounts SET currency = 'USD' WHERE id = 'starter-cash'`);

    await completeOnboarding(
      db,
      {
        draft,
        expectedIncomeMinor: 250_000,
        payDay: 28,
        budgetsMinor: { housing: 90_000, transport: 15_000 },
      },
      '2026-07',
    );
    await completeOnboarding(
      db,
      {
        draft,
        expectedIncomeMinor: 250_000,
        payDay: 28,
        budgetsMinor: { housing: 90_000, transport: 15_000 },
      },
      '2026-07',
    );

    expect(await getAppPreferences(db)).toMatchObject({
      mainCurrency: 'USD',
      onboardingStatus: 'complete',
    });
    expect(await listExpectedIncome(db)).toHaveLength(1);
    expect(await listBudgets(db, '2026-07', 'USD')).toHaveLength(2);
    expect(await listTransactions(db)).toHaveLength(0);
  });

  it('persists independent local reminder controls with safe defaults', async () => {
    expect(await getAppPreferences(db)).toMatchObject({
      remindersEnabled: false,
      remindSchedules: true,
      remindPaydays: true,
      remindWeeklyReview: true,
    });

    await saveReminderPreference(db, 'remindersEnabled', true);
    await saveReminderPreference(db, 'remindPaydays', false);

    expect(await getAppPreferences(db)).toMatchObject({
      remindersEnabled: true,
      remindSchedules: true,
      remindPaydays: false,
      remindWeeklyReview: true,
    });
  });

  it('persists the selected debt payoff strategy', async () => {
    expect((await getAppPreferences(db)).debtStrategy).toBe('avalanche');
    await saveDebtStrategy(db, 'snowball');
    expect((await getAppPreferences(db)).debtStrategy).toBe('snowball');
  });
});
