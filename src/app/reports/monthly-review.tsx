import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildMonthlyReview,
  type MonthlyChange,
} from '@/domain/monthlyReview';
import { formatMoney } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function MonthlyReviewScreen() {
  const {
    accounts,
    categorySpending,
    debtPayments,
    debts,
    financialSnapshots,
    monthlySummary,
    monthlyTrends,
    preferences,
    savingsGoals,
  } = useFinance();
  const review = useMemo(
    () =>
      buildMonthlyReview({
        now: new Date(),
        currency: preferences.mainCurrency,
        monthlySummary,
        monthlyTrends,
        categorySpending,
        accounts,
        savingsGoals,
        debts,
        debtPayments,
        financialSnapshots,
      }),
    [
      accounts,
      categorySpending,
      debtPayments,
      debts,
      financialSnapshots,
      monthlySummary,
      monthlyTrends,
      preferences.mainCurrency,
      savingsGoals,
    ],
  );
  const currency = preferences.mainCurrency;
  const monthLabel = new Intl.DateTimeFormat('en-KE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${review.month}-01T00:00:00.000Z`));
  const hero =
    review.incomeMinor === 0 && review.expenseMinor === 0
      ? {
          title: 'Your month is ready when you are',
          detail: 'Record income and expenses to build an honest monthly story.',
          icon: 'calendar-outline' as const,
          negative: false,
        }
      : review.netMinor > 0
        ? {
            title: `You kept ${formatMoney(review.netMinor, currency)} after spending`,
            detail: `${formatMoney(review.incomeMinor, currency)} income minus ${formatMoney(review.expenseMinor, currency)} spending.`,
            icon: 'trending-up-outline' as const,
            negative: false,
          }
        : review.netMinor < 0
          ? {
              title: `Spending is ${formatMoney(Math.abs(review.netMinor), currency)} above income`,
              detail: `${formatMoney(review.expenseMinor, currency)} spending compared with ${formatMoney(review.incomeMinor, currency)} income.`,
              icon: 'trending-down-outline' as const,
              negative: true,
            }
          : {
              title: 'Income and spending are even',
              detail: `You recorded ${formatMoney(review.incomeMinor, currency)} on each side.`,
              icon: 'remove-outline' as const,
              negative: false,
            };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close monthly review"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Monthly review</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{monthLabel.toUpperCase()}</Text>
        <View style={[styles.hero, hero.negative && styles.heroNegative]}>
          <View style={styles.heroIcon}>
            <Ionicons
              name={hero.icon}
              size={24}
              color={hero.negative ? colors.expense : colors.primary}
            />
          </View>
          <Text style={styles.heroTitle}>{hero.title}</Text>
          <Text style={styles.heroDetail}>{hero.detail}</Text>
        </View>

        <Text style={styles.sectionTitle}>The month in four numbers</Text>
        <View style={styles.metricGrid}>
          <Metric
            label="Income"
            value={formatMoney(review.incomeMinor, currency)}
            icon="arrow-down-outline"
          />
          <Metric
            label="Spent"
            value={formatMoney(review.expenseMinor, currency)}
            icon="arrow-up-outline"
            negative
          />
          <Metric
            label="Left after spending"
            value={formatMoney(review.netMinor, currency)}
            icon="swap-vertical-outline"
            negative={review.netMinor < 0}
          />
          <Metric
            label="In savings accounts"
            value={formatMoney(review.savingsBalanceMinor, currency)}
            icon="shield-checkmark-outline"
          />
        </View>

        <Text style={styles.sectionTitle}>What changed</Text>
        <View style={styles.panel}>
          {review.hasPreviousCashFlow ? (
            <>
              <ChangeRow
                label="Income"
                currentMinor={review.incomeMinor}
                change={review.incomeChange}
                currency={currency}
              />
              <ChangeRow
                label="Spending"
                currentMinor={review.expenseMinor}
                change={review.expenseChange}
                currency={currency}
                lowerIsBetter
              />
              <ChangeRow
                label="Left after spending"
                currentMinor={review.netMinor}
                change={review.netChange}
                currency={currency}
              />
            </>
          ) : (
            <EmptyMessage
              icon="git-compare-outline"
              title="Your first comparison starts here"
              body="After another month of activity, this section will show exactly what increased or decreased."
            />
          )}
        </View>

        <Text style={styles.sectionTitle}>Your money story</Text>
        {review.topCategory ? (
          <StoryCard
            icon={review.topCategory.categoryIcon as keyof typeof Ionicons.glyphMap}
            title={`${review.topCategory.categoryName} was your largest spending category`}
            detail={`${formatMoney(review.topCategory.amountMinor, currency)} made up ${review.topCategoryShare.toFixed(0)}% of recorded spending.`}
          />
        ) : (
          <StoryCard
            icon="receipt-outline"
            title="No spending category leads yet"
            detail="This changes only when you record an expense."
          />
        )}

        <StoryCard
          icon="shield-checkmark-outline"
          title={
            review.savingsBalanceMinor > 0
              ? `${formatMoney(review.savingsBalanceMinor, currency)} is in real savings accounts`
              : 'No money is recorded in a savings account'
          }
          detail={
            review.savingsBalanceMinor > 0
              ? savingsStory(
                  review.allocatedSavingsMinor,
                  review.unallocatedSavingsMinor,
                  review.savingsAllocationShortfallMinor,
                  currency,
                )
              : 'A positive cash-flow balance is useful, but it is not counted as real savings until it is held in a savings account.'
          }
        />

        <StoryCard
          icon="trending-down-outline"
          title={
            review.debtBalanceMinor > 0
              ? `${formatMoney(review.debtPaidMinor, currency)} recorded toward debt this month`
              : review.debtPaidMinor > 0
                ? 'Your recorded debts are cleared'
                : 'No active debt is recorded'
          }
          detail={debtStory(review.debtBalanceMinor, review.debtBalanceChange, currency)}
          positive={
            review.debtBalanceChange !== null &&
            review.debtBalanceChange.amountMinor < 0
          }
        />

        <StoryCard
          icon="analytics-outline"
          title={`Recorded net worth is ${formatMoney(review.netWorthMinor, currency)}`}
          detail={
            review.netWorthChange
              ? `${describeChange(review.netWorthChange, currency)} from last month. Net worth is account balances minus active debt.`
              : 'A month-to-month change will appear after a previous snapshot exists. Net worth is account balances minus active debt.'
          }
          positive={
            review.netWorthChange !== null &&
            review.netWorthChange.amountMinor > 0
          }
        />

        <View style={styles.explainer}>
          <Ionicons name="information-circle-outline" size={19} color={colors.primary} />
          <Text style={styles.explainerText}>
            Every statement comes from confirmed local records. Other currencies are excluded
            because Pesa Plan does not guess exchange rates, and no money is moved automatically.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  label,
  value,
  icon,
  negative = false,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  negative?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons
        name={icon}
        size={19}
        color={negative ? colors.expense : colors.primary}
      />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, negative && styles.negativeText]}>
        {value}
      </Text>
    </View>
  );
}

function ChangeRow({
  label,
  currentMinor,
  change,
  currency,
  lowerIsBetter = false,
}: {
  label: string;
  currentMinor: number;
  change: MonthlyChange | null;
  currency: string;
  lowerIsBetter?: boolean;
}) {
  const amount = change?.amountMinor ?? 0;
  const positive = lowerIsBetter ? amount < 0 : amount > 0;
  const negative = lowerIsBetter ? amount > 0 : amount < 0;
  return (
    <View style={styles.changeRow}>
      <View style={styles.changeMain}>
        <Text style={styles.changeLabel}>{label}</Text>
        <Text style={styles.changeCurrent}>{formatMoney(currentMinor, currency)}</Text>
      </View>
      <Text
        style={[
          styles.changeValue,
          positive && styles.positiveText,
          negative && styles.negativeText,
        ]}
      >
        {change ? describeChange(change, currency) : 'No comparison'}
      </Text>
    </View>
  );
}

function StoryCard({
  icon,
  title,
  detail,
  positive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  positive?: boolean;
}) {
  return (
    <View style={styles.storyCard}>
      <View style={[styles.storyIcon, positive && styles.storyIconPositive]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.storyBody}>
        <Text style={styles.storyTitle}>{title}</Text>
        <Text style={styles.storyDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function EmptyMessage({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={28} color={colors.primary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function describeChange(change: MonthlyChange, currency: string): string {
  if (change.amountMinor === 0) return 'No change';
  const direction = change.amountMinor > 0 ? 'Up' : 'Down';
  const percentage =
    change.percent === null ? '' : ` (${Math.abs(change.percent).toFixed(0)}%)`;
  return `${direction} ${formatMoney(Math.abs(change.amountMinor), currency)}${percentage}`;
}

function debtStory(
  balanceMinor: number,
  change: MonthlyChange | null,
  currency: string,
): string {
  if (balanceMinor <= 0) {
    return 'There is no remaining active debt balance in your records.';
  }
  if (!change) {
    return `${formatMoney(balanceMinor, currency)} remains. A balance comparison will appear after a previous monthly snapshot exists.`;
  }
  const movement =
    change.amountMinor === 0
      ? 'The recorded balance is unchanged from last month'
      : change.amountMinor < 0
        ? `The recorded balance fell by ${formatMoney(Math.abs(change.amountMinor), currency)}`
        : `The recorded balance rose by ${formatMoney(change.amountMinor, currency)}`;
  return `${formatMoney(balanceMinor, currency)} remains. ${movement}. Balance movement can include new debt as well as payments.`;
}

function savingsStory(
  allocatedMinor: number,
  unallocatedMinor: number,
  shortfallMinor: number,
  currency: string,
): string {
  const allocation =
    shortfallMinor > 0
      ? `Goal allocations exceed the real balance by ${formatMoney(shortfallMinor, currency)}.`
      : `${formatMoney(allocatedMinor, currency)} is assigned to goals and ${formatMoney(unallocatedMinor, currency)} is unallocated.`;
  return `${allocation} The cash-flow result above is not treated as saved unless money is actually in a savings account.`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginTop: spacing.md, marginBottom: spacing.sm },
  hero: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: spacing.xl },
  heroNegative: { backgroundColor: '#542C27' },
  heroIcon: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  heroTitle: { color: '#FFFFFF', fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  heroDetail: { color: '#C7D8D0', fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '48%', minHeight: 126, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  metricLabel: { color: colors.muted, fontSize: 11, marginTop: spacing.md },
  metricValue: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: spacing.xs },
  panel: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  changeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  changeMain: { flex: 1 },
  changeLabel: { color: colors.muted, fontSize: 11 },
  changeCurrent: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: spacing.xs },
  changeValue: { color: colors.muted, fontSize: 11, fontWeight: '800', textAlign: 'right', marginLeft: spacing.md },
  positiveText: { color: colors.income },
  negativeText: { color: colors.expense },
  storyCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  storyIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  storyIconPositive: { backgroundColor: '#D8F0E5' },
  storyBody: { flex: 1 },
  storyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  storyDetail: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  empty: { alignItems: 'center', padding: spacing.xl },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: spacing.md },
  emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: spacing.xs },
  explainer: { flexDirection: 'row', backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.md },
  explainerText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 17, marginLeft: spacing.sm },
});
