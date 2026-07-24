import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { formatMoney } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function ReportsScreen() {
  const { monthlySummary } = useFinance();
  const metrics = [
    { label: 'Income this month', value: formatMoney(monthlySummary.incomeMinor) },
    { label: 'Expenses this month', value: formatMoney(monthlySummary.expenseMinor) },
    { label: 'Net cash flow', value: formatMoney(monthlySummary.netMinor) },
    { label: 'Savings rate', value: `${monthlySummary.savingsRate.toFixed(1)}%` },
  ];

  return (
    <Screen>
      <Text style={styles.eyebrow}>KNOW YOUR NUMBERS</Text>
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.subtitle}>A clean snapshot of your current month.</Text>
      <View style={styles.grid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>More insight in Stage 4</Text>
        <Text style={styles.noticeText}>
          Category trends, net-worth history, and forecasting will build on this verified data.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    width: '48%',
    minHeight: 126,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  notice: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  noticeTitle: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  noticeText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
});
