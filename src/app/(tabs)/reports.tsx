import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { debtToIncomeRatio, formatMoney } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function ReportsScreen() {
  const {
    monthlySummary,
    categorySpending,
    monthlyTrends,
    financialSnapshots,
    forecast30DayNetMinor,
    debts,
    preferences,
  } = useFinance();
  const minimumDebtPayments = debts.reduce((sum, debt) => sum + debt.minimumPaymentMinor, 0);
  const dti = debtToIncomeRatio(minimumDebtPayments, monthlySummary.incomeMinor);
  const maxCategory = Math.max(...categorySpending.map((item) => item.amountMinor), 1);
  const maxTrend = Math.max(
    ...monthlyTrends.flatMap((item) => [item.incomeMinor, item.expenseMinor]),
    1,
  );

  return (
    <Screen>
      <Text style={styles.eyebrow}>KNOW YOUR NUMBERS</Text>
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.subtitle}>
        {preferences.mainCurrency}-based insight from your local ledger.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open this month's review"
        onPress={() => router.push('/reports/monthly-review')}
        style={({ pressed }) => [styles.reviewCard, pressed && styles.pressed]}
      >
        <View style={styles.reviewIcon}>
          <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.reviewBody}>
          <Text style={styles.reviewEyebrow}>NEW · MONTHLY REVIEW</Text>
          <Text style={styles.reviewTitle}>See the story behind this month</Text>
          <Text style={styles.reviewText}>
            Income, spending, real savings, debt progress, and what changed.
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={colors.primary} />
      </Pressable>

      <View style={styles.grid}>
        <Metric label="Savings rate" value={`${monthlySummary.savingsRate.toFixed(1)}%`} />
        <Metric label="Debt-to-income" value={`${dti.toFixed(1)}%`} />
        <Metric label="Net cash flow" value={formatMoney(monthlySummary.netMinor, preferences.mainCurrency)} />
        <Metric
          label="Next 30 days"
          value={formatMoney(forecast30DayNetMinor, preferences.mainCurrency)}
          negative={forecast30DayNetMinor < 0}
        />
      </View>

      <Text style={styles.section}>Spending by category</Text>
      <View style={styles.panel}>
        {categorySpending.map((category) => (
          <View key={category.categoryId} style={styles.categoryRow}>
            <View style={styles.rowTop}>
              <Text style={styles.rowLabel}>{category.categoryName}</Text>
              <Text style={styles.rowValue}>
                {formatMoney(category.amountMinor, preferences.mainCurrency)}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.categoryFill,
                  { width: `${(category.amountMinor / maxCategory) * 100}%` },
                ]}
              />
            </View>
          </View>
        ))}
        {!categorySpending.length ? <Text style={styles.empty}>No expenses this month.</Text> : null}
      </View>

      <Text style={styles.section}>Monthly cash flow</Text>
      <View style={styles.panel}>
        {[...monthlyTrends].reverse().map((trend) => (
          <View key={trend.month} style={styles.trendRow}>
            <Text style={styles.month}>{trend.month}</Text>
            <View style={styles.trendBars}>
              <View style={[styles.incomeBar, { width: `${(trend.incomeMinor / maxTrend) * 100}%` }]} />
              <View style={[styles.expenseBar, { width: `${(trend.expenseMinor / maxTrend) * 100}%` }]} />
            </View>
          </View>
        ))}
        <View style={styles.legend}>
          <Text style={styles.incomeLegend}>● Income</Text>
          <Text style={styles.expenseLegend}>● Expenses</Text>
        </View>
      </View>

      <Text style={styles.section}>Net worth history</Text>
      <View style={styles.panel}>
        {financialSnapshots.map((snapshot) => (
          <View key={snapshot.month} style={styles.snapshot}>
            <Text style={styles.month}>{snapshot.month}</Text>
            <Text style={[styles.snapshotValue, snapshot.netWorthMinor < 0 && styles.negative]}>
              {formatMoney(snapshot.netWorthMinor, snapshot.currency)}
            </Text>
          </View>
        ))}
        <Text style={styles.note}>
          One snapshot is retained per month and currency. Accounts outside your main currency
          are excluded because no exchange rate is assumed offline.
        </Text>
      </View>
    </Screen>
  );
}

function Metric({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, negative && styles.negative]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: spacing.sm },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: spacing.sm, marginBottom: spacing.xl },
  reviewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, borderWidth: 1, borderColor: '#C4DCCE', padding: spacing.lg, marginBottom: spacing.xl },
  reviewIcon: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  reviewBody: { flex: 1, paddingRight: spacing.sm },
  reviewEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  reviewTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: spacing.xs },
  reviewText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
  pressed: { opacity: 0.7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '48%', minHeight: 118, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, justifyContent: 'space-between' },
  metricLabel: { color: colors.muted, fontSize: 12 },
  metricValue: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  negative: { color: colors.expense },
  section: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  panel: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  categoryRow: { marginBottom: spacing.md },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  rowLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  rowValue: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  categoryFill: { height: 8, backgroundColor: colors.primary, borderRadius: radius.pill },
  empty: { color: colors.muted, fontSize: 13, textAlign: 'center', padding: spacing.lg },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  month: { width: 64, color: colors.muted, fontSize: 11, fontWeight: '700' },
  trendBars: { flex: 1, gap: 4 },
  incomeBar: { height: 7, minWidth: 2, backgroundColor: colors.income, borderRadius: radius.pill },
  expenseBar: { height: 7, minWidth: 2, backgroundColor: colors.expense, borderRadius: radius.pill },
  legend: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  incomeLegend: { color: colors.income, fontSize: 11, fontWeight: '700' },
  expenseLegend: { color: colors.expense, fontSize: 11, fontWeight: '700' },
  snapshot: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  snapshotValue: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: spacing.md },
});
